import { displayName, inferLocationType, normalizeStreet, normalizeZip, titleCase } from './text';

describe('displayName', () => {
  it.each([
    ['South Boston', false, 'South Boston Farmers Market'],
    ['Cambridge/Central Square', false, 'Central Square Farmers Market'],
    ['Cambridge/Farmers Market at Harvard', false, 'Farmers Market at Harvard'],
    ['Cambridge Winter/Charles River Winter', true, 'Charles River Winter Farmers Market'],
    ['Lawrence/Saturday', false, 'Lawrence Saturday Farmers Market'],
    ['East Boston Winter/Spring', true, 'East Boston Winter Farmers Market'],
    ['Great Barrington Winter', true, 'Great Barrington Winter Farmers Market'],
    ['Belchertown Winter Market at Jabish Brook', true, 'Belchertown Winter Market at Jabish Brook'],
    ['Franklin/Fairmount Fruit Farm', true, 'Fairmount Fruit Farm Winter Market'],
    ['Boston Public Market', false, 'Boston Public Market'],
    ["Fairhaven/Roxanne's Garden Center", false, "Roxanne's Garden Center Farmers Market"],
  ])('%s', (raw, winter, expected) => expect(displayName(raw, winter)).toBe(expected));
});

describe('address normalization', () => {
  it('abbreviates street types', () =>
    expect(normalizeStreet('446 West Broadway Street')).toBe('446 W Broadway St'));
  it('pads Massachusetts ZIPs that lost their leading zero', () => {
    expect(normalizeZip('2536')).toBe('02536');
    expect(normalizeZip('02127-1234')).toBe('02127');
  });
  it('title-cases without mangling apostrophes', () =>
    expect(titleCase("ST. ANNE'S HOSPITAL")).toBe("St. Anne's Hospital"));
});

describe('inferLocationType', () => {
  it('reads location hints', () => {
    expect(inferLocationType('West Broadway Municipal Front Parking Lot').locationType).toBe('parking_lot');
    expect(inferLocationType('The Annisquam Village Hall')).toEqual({
      locationType: 'indoor_hall',
      indoor: true,
    });
    expect(inferLocationType('Langwater Farm').locationType).toBe('farm');
  });
});
