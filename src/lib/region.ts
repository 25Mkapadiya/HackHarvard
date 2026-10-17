import { distanceKm, type LatLng } from './geo';

// Mirrors scripts/enrich.ts: "Greater Boston" is within 25 km of Boston City Hall.
const CITY_HALL: LatLng = { lat: 42.3603, lng: -71.058 };
export const inGreaterBostonView = (m: { geo: LatLng }) => distanceKm(m.geo, CITY_HALL) <= 25;
