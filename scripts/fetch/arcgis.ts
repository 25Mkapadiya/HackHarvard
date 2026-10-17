import { fetchText } from '../lib/http';

type Feature = {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown } | null;
};
export type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

/** Pages through an ArcGIS REST query endpoint and returns one GeoJSON FeatureCollection. */
export async function arcgisQuery(
  layerUrl: string,
  params: Record<string, string>,
  pageSize = 1000,
): Promise<string> {
  const features: Feature[] = [];
  for (let offset = 0; ; offset += pageSize) {
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
    features.push(...(body.features ?? []));
    const more = body.exceededTransferLimit || body.properties?.exceededTransferLimit;
    if (!more || (body.features ?? []).length === 0) break;
  }
  return JSON.stringify({ type: 'FeatureCollection', features });
}
