import { fetchText } from '../lib/http';

type Feature = {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown } | null;
};
export type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

/**
 * Pages through an ArcGIS REST query endpoint and returns one GeoJSON FeatureCollection.
 * Servers cap pages at their own maxRecordCount and don't always set exceededTransferLimit,
 * so we advance by what each page actually returned and stop on an empty page. Pass
 * `orderByFields` (usually the object-id field) so pages are stable.
 */
export async function arcgisQuery(
  layerUrl: string,
  params: Record<string, string>,
  pageSize = 1000,
): Promise<string> {
  const features: Feature[] = [];
  for (let offset = 0; ;) {
    const qs = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      outSR: '4326',
      f: 'geojson',
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
      ...params,
    });
    const body = JSON.parse(await fetchText(`${layerUrl}/query?${qs}`));
    if (body.error) throw new Error(`ArcGIS error: ${JSON.stringify(body.error)}`);
    const page: Feature[] = body.features ?? [];
    features.push(...page);
    const more = body.exceededTransferLimit || body.properties?.exceededTransferLimit;
    if (page.length === 0 || (!more && page.length < pageSize)) break;
    offset += page.length;
  }
  return JSON.stringify({ type: 'FeatureCollection', features });
}
