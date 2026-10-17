import { timeZoneFor } from './tz';

describe('timeZoneFor', () => {
  it.each([
    ['MA', 42.36, -71.06, 'America/New_York'],
    ['CA', 34.05, -118.24, 'America/Los_Angeles'],
    ['AZ', 33.45, -112.07, 'America/Phoenix'],
    ['CO', 39.74, -104.99, 'America/Denver'],
    ['TX', 29.76, -95.37, 'America/Chicago'],
    ['TX', 31.76, -106.49, 'America/Denver'], // El Paso
    ['FL', 25.76, -80.19, 'America/New_York'], // Miami
    ['FL', 30.42, -87.22, 'America/Chicago'], // Pensacola
    ['TN', 35.96, -83.92, 'America/New_York'], // Knoxville
    ['TN', 36.16, -86.78, 'America/Chicago'], // Nashville
    ['KY', 38.25, -85.76, 'America/New_York'], // Louisville
    ['ID', 47.68, -116.78, 'America/Los_Angeles'], // Coeur d'Alene
    ['ID', 43.62, -116.2, 'America/Denver'], // Boise
  ])('%s %f,%f → %s', (st, lat, lng, tz) => expect(timeZoneFor(st, lat, lng)).toBe(tz));
});
