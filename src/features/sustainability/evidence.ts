import { z } from 'zod';
export const METHOD_VERSION = 'market-impact/1.0.0';
export const Provenance = z.object({
  source: z.string().trim().min(1),
  url: z.url().refine((u) => /^https?:\/\//.test(u)),
  assumptions: z.array(z.string().trim().min(1)).min(1),
  quality: z.enum(['measured', 'regional-baseline', 'product-baseline', 'user-reported']),
});
export type Provenance = z.infer<typeof Provenance>;
export const evidence = <U extends string>(unit: U) =>
  z.object({ value: z.number().finite().nonnegative(), unit: z.literal(unit), provenance: Provenance });
export type Evidence<U extends string> = { value: number; unit: U; provenance: Provenance };
export type Metric = {
  value: number | null;
  /** Only the covered subset; never presented as the whole basket result. */
  knownSubtotal: number | null;
  unit: string;
  covered: number;
  expected: number;
  missing: string[];
  sources: Provenance[];
  quality: 'unavailable' | 'partial' | 'evidence-based';
  methodVersion: string;
  assumptions: string[];
};
export function metric(
  values: number[],
  expected: number,
  unit: string,
  missing: string[],
  sources: Provenance[],
  assumptions: string[] = [],
): Metric {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(sum)) throw new Error('Metric overflow');
  const complete = values.length === expected && missing.length === 0;
  return {
    value: complete ? sum : null,
    knownSubtotal: values.length ? sum : null,
    unit,
    covered: values.length,
    expected,
    missing,
    sources,
    quality: complete && expected > 0 ? 'evidence-based' : values.length ? 'partial' : 'unavailable',
    methodVersion: METHOD_VERSION,
    assumptions,
  };
}
/** IDs are scoped by visit; JSON encoding avoids ambiguous concatenated keys. */
export const itemEvidenceKey = (submissionId: string, itemId: string) =>
  JSON.stringify([submissionId, itemId]);
