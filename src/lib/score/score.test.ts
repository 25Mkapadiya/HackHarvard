import { scoreBreakdown, sustainabilityScore, SCORE_RULES } from '.';

describe('sustainability score', () => {
  it('is zero with no inputs', () => {
    expect(sustainabilityScore({ certifications: [], practices: [], programs: [] })).toBe(0);
  });

  it('category maxima add up to 100', () => {
    const total = Object.values(SCORE_RULES).reduce((s, r) => s + r.max, 0);
    expect(total).toBe(100);
  });

  it('gives half credit for an unverified certification and says how to improve', () => {
    const cats = scoreBreakdown({
      certifications: [{ id: 'usda_organic', label: 'USDA Organic', verified: false }],
      practices: [],
      programs: [],
    });
    const cert = cats.find((c) => c.key === 'certification')!;
    expect(cert.earned).toBe(10);
    expect(cert.lines[0].selfReported).toBe(true);
    expect(cert.improve).toMatch(/upload/i);
  });

  it('caps each category at its max', () => {
    const cats = scoreBreakdown({
      certifications: [],
      practices: ['plastic_free_packaging', 'compostable_packaging', 'reusable_containers'].map((id) => ({
        id: id as 'plastic_free_packaging',
        selfReported: true,
      })),
      programs: [],
    });
    expect(cats.find((c) => c.key === 'packaging')!.earned).toBe(15);
    expect(cats.find((c) => c.key === 'packaging')!.improve).toBeNull();
  });

  it('scores food miles by distance band', () => {
    const miles = (m: number) =>
      scoreBreakdown({ certifications: [], practices: [], programs: [], foodMiles: m }).find(
        (c) => c.key === 'foodMiles',
      )!.earned;
    expect(miles(10)).toBe(20);
    expect(miles(25)).toBe(20);
    expect(miles(26)).toBe(15);
    expect(miles(99)).toBe(10);
    expect(miles(300)).toBe(0);
  });

  it('a strong vendor scores 100', () => {
    expect(
      sustainabilityScore({
        certifications: [{ id: 'cng', label: 'Certified Naturally Grown', verified: true }],
        practices: (
          [
            'plastic_free_packaging',
            'reusable_containers',
            'composts_waste',
            'donates_surplus',
            'cover_crops',
            'no_till',
            'integrated_pest_mgmt',
            'water_conservation',
            'renewable_energy',
          ] as const
        ).map((id) => ({ id, selfReported: false })),
        programs: ['snap', 'hip', 'wic_fmnp'],
        foodMiles: 12,
      }),
    ).toBe(100);
  });
});
