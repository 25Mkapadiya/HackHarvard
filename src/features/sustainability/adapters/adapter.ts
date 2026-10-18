import { buildTransportEvidence } from './transportAdapter';
import { z } from 'zod';
import { PurchaseItem } from '../../purchases/model';
import { quantityKg } from '../foodMiles';
import type { Provenance } from '../evidence';
import type { ImpactData } from '../summary';
import { EvidenceCatalog, type ComparisonRecord, type DatasetSource } from './schema';
export const EvidenceRequest = z.object({
  item: PurchaseItem,
  market: z.object({ id: z.string().min(1), city: z.string().min(1), state: z.string().regex(/^[A-Z]{2}$/) }),
  purchaseDate: z.iso.date(),
  scenarioId: z.string().min(1).optional(),
  origin: z
    .object({
      label: z.string().trim().min(1),
      documentUrl: z.url(),
      validFrom: z.iso.date(),
      validTo: z.iso.date(),
    })
    .optional(),
});
export type EvidenceRequest = z.infer<typeof EvidenceRequest>;
export type MissingField = {
  field:
    | 'input'
    | 'product'
    | 'origin'
    | 'comparison'
    | 'location'
    | 'date'
    | 'mass'
    | 'localSpending'
    | 'price'
    | 'transport'
    | 'lifecycle';
  reason: string;
};
export type ItemImpactEvidence = NonNullable<ImpactData['items']>[string];
export type EvidenceResolution = {
  basis: 'unknown' | 'modeled-scenario' | 'actual-observed';
  evidence: ItemImpactEvidence;
  catalogVersion: string;
  record?: ComparisonRecord;
  sources: DatasetSource[];
  missing: MissingField[];
};
const normalize = (s: string) => s.trim().toLowerCase();
export function recordProvenance(record: ComparisonRecord, source: DatasetSource): Provenance {
  return {
    source: `${source.name} — ${record.label}`,
    url: source.url,
    quality: record.basis === 'modeled-scenario' ? 'regional-baseline' : 'measured',
    assumptions: [
      `${record.basis}; source published ${source.publicationDate}; observations ${source.observationPeriod}; ${source.sourceLocator}.`,
      `Scope: ${source.geography}. Method: ${source.methodology}.`,
      ...record.assumptions,
    ],
  };
}
/** Audited build-time catalog only. Schema validation cannot verify the truth of a source. */
export function createEvidenceAdapter(rawCatalog: unknown) {
  const catalog = EvidenceCatalog.parse(rawCatalog);
  function resolve(rawRequest: unknown): EvidenceResolution {
    const result: EvidenceResolution = {
      basis: 'unknown',
      evidence: {},
      catalogVersion: catalog.version,
      sources: [],
      missing: [],
    };
    const parsed = EvidenceRequest.safeParse(rawRequest);
    if (!parsed.success) {
      result.missing.push({
        field: 'input',
        reason: 'Invalid product, quantity/unit, market location, or purchase date.',
      });
      return result;
    }
    const request = parsed.data;
    const product = catalog.products.find((p) =>
      p.aliases.some((a) => normalize(a) === normalize(request.item.product)),
    );
    if (!product) {
      result.missing.push({
        field: 'product',
        reason:
          'No reviewed evidence for this product identification. Use an exact supported fresh-product name.',
      });
      return result;
    }
    result.missing.push({
      field: 'localSpending',
      reason: 'No purchase-specific local spending attribution is established by this dataset.',
    });
    if (!quantityKg(request.item, { region: request.market.state, date: request.purchaseDate }))
      result.missing.push({
        field: 'mass',
        reason:
          'Enter a weighed kg/g/lb/oz quantity; no matched regional price is available to estimate mass.',
      });
    result.missing.push({
      field: 'price',
      reason:
        'No matched regional, dated retail price baseline; spending-based mass estimation is unavailable.',
    });
    const eligible = catalog.comparisons.filter((r) => r.productId === product.id);
    let record: ComparisonRecord | undefined;
    if (request.scenarioId)
      record = eligible.find((r) => r.id === request.scenarioId && r.basis === 'modeled-scenario');
    else
      record = eligible.find(
        (r) =>
          r.basis === 'actual-observed' &&
          r.scope.marketIds?.includes(request.market.id) &&
          r.originDocumentUrl === request.origin?.documentUrl &&
          normalize(r.local.originLabel) === normalize(request.origin?.label ?? ''),
      );
    if (!record) {
      if (!request.origin)
        result.missing.push({
          field: 'origin',
          reason: 'The purchased product’s actual production origin is undocumented.',
        });
      result.missing.push({
        field: 'comparison',
        reason: request.scenarioId
          ? 'No reviewed scenario matches the selected product and scenario ID.'
          : 'No documented purchase-specific conventional/local comparison. An origin alone cannot establish both supply chains.',
      });
      return result;
    }
    if (
      record.scope.state !== request.market.state ||
      !record.scope.cities.some((city) => normalize(city) === normalize(request.market.city)) ||
      (record.scope.marketIds && !record.scope.marketIds.includes(request.market.id))
    ) {
      result.missing.push({
        field: 'location',
        reason: 'This comparison does not apply to the selected market location.',
      });
      return result;
    }
    const month = Number(request.purchaseDate.slice(5, 7));
    if (
      request.purchaseDate < record.applicableFrom ||
      request.purchaseDate > record.applicableTo ||
      !record.months.includes(month)
    ) {
      result.missing.push({
        field: 'date',
        reason: 'Purchase date or selling season is outside this comparison’s reviewed applicability.',
      });
      return result;
    }
    if (
      record.basis === 'actual-observed' &&
      (!request.origin ||
        request.purchaseDate < request.origin.validFrom ||
        request.purchaseDate > request.origin.validTo)
    ) {
      result.missing.push({
        field: 'origin',
        reason: 'The origin document does not cover this purchase date.',
      });
      return result;
    }
    const source = catalog.sources.find((s) => s.id === record.sourceId)!;
    const provenance = recordProvenance(record, source);
    result.basis = record.basis;
    result.record = record;
    result.sources = [source];
    result.evidence = {
      region: request.market.state,
      distances: {
        local: {
          ...record.local.distance,
          provenance: {
            ...provenance,
            assumptions: [
              ...provenance.assumptions,
              `Local: ${record.local.originLabel} → ${record.local.destinationLabel}; ${record.local.sourceLocator}.`,
            ],
          },
        },
        conventional: {
          ...record.conventional.distance,
          provenance: {
            ...provenance,
            assumptions: [
              ...provenance.assumptions,
              `Conventional: ${record.conventional.originLabel} → ${record.conventional.destinationLabel}; ${record.conventional.sourceLocator}.`,
            ],
          },
        },
      },
    };
    if (record.lifecycle && normalize(record.lifecycle.product) === normalize(request.item.product))
      result.evidence.lifecycle = record.lifecycle;
    else
      result.missing.push({
        field: 'lifecycle',
        reason: 'No compatible paired, stage-resolved life-cycle dataset covers this item.',
      });
    const transport = buildTransportEvidence(record, provenance);
    if (transport.transport) result.evidence.transport = transport.transport;
    else result.missing.push({ field: 'transport', reason: transport.reason! });
    return result;
  }
  return { catalog, resolve };
}
