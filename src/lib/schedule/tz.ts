// IANA time zone for a mainland market, from its state, with approximate longitude/latitude
// cut-offs for states split across zones. Arizona (America/Phoenix) has no daylight saving time.

const EASTERN = 'America/New_York';
const CENTRAL = 'America/Chicago';
const MOUNTAIN = 'America/Denver';
const PACIFIC = 'America/Los_Angeles';

const BY_STATE: Record<string, string> = {
  CT: EASTERN,
  DE: EASTERN,
  DC: EASTERN,
  GA: EASTERN,
  ME: EASTERN,
  MD: EASTERN,
  MA: EASTERN,
  NH: EASTERN,
  NJ: EASTERN,
  NY: EASTERN,
  NC: EASTERN,
  OH: EASTERN,
  PA: EASTERN,
  RI: EASTERN,
  SC: EASTERN,
  VT: EASTERN,
  VA: EASTERN,
  WV: EASTERN,
  FL: EASTERN,
  IN: EASTERN,
  KY: EASTERN,
  MI: EASTERN,
  TN: EASTERN,
  AL: CENTRAL,
  AR: CENTRAL,
  IL: CENTRAL,
  IA: CENTRAL,
  LA: CENTRAL,
  MN: CENTRAL,
  MS: CENTRAL,
  MO: CENTRAL,
  OK: CENTRAL,
  WI: CENTRAL,
  TX: CENTRAL,
  KS: CENTRAL,
  NE: CENTRAL,
  ND: CENTRAL,
  SD: CENTRAL,
  CO: MOUNTAIN,
  MT: MOUNTAIN,
  NM: MOUNTAIN,
  UT: MOUNTAIN,
  WY: MOUNTAIN,
  ID: MOUNTAIN,
  AZ: 'America/Phoenix',
  CA: PACIFIC,
  NV: PACIFIC,
  OR: PACIFIC,
  WA: PACIFIC,
};

export function timeZoneFor(state: string, lat: number, lng: number): string {
  switch (state) {
    case 'FL':
      return lng < -85.0 ? CENTRAL : EASTERN; // panhandle west of the Apalachicola River
    case 'TN':
      return lng < -85.4 ? CENTRAL : EASTERN;
    case 'KY':
      return lng < -86.0 ? CENTRAL : EASTERN;
    case 'IN':
      return lng < -86.9 ? CENTRAL : EASTERN; // Chicago suburbs and the Evansville area
    case 'MI':
      return lat > 45.5 && lng < -87.4 ? CENTRAL : EASTERN; // western Upper Peninsula
    case 'TX':
      return lng < -104.9 ? MOUNTAIN : CENTRAL; // El Paso
    case 'ND':
      return lng < -101.3 && lat < 47.5 ? MOUNTAIN : CENTRAL;
    case 'SD':
      return lng < -100.6 ? MOUNTAIN : CENTRAL; // west of the Missouri River
    case 'NE':
    case 'KS':
      return lng < -101.5 ? MOUNTAIN : CENTRAL;
    case 'ID':
      return lat > 45.6 ? PACIFIC : MOUNTAIN; // the panhandle
    case 'OR':
      return lng > -117.7 && lat < 44.8 ? MOUNTAIN : PACIFIC; // Malheur County
    default:
      return BY_STATE[state] ?? EASTERN;
  }
}
