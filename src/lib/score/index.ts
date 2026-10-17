import type { Certification, PracticeId, ProgramId, SustainabilityPractice } from '../../types';

// Sustainability score v1. Public and deliberately simple: six categories, 100 points.
// The /how-scores-work page renders SCORE_RULES directly, so the docs can't drift from the math.

export type ScoreInput = {
  certifications: Certification[];
  practices: SustainabilityPractice[];
  foodMiles?: number;
  programs: ProgramId[];
};

export type ScoreLine = { label: string; points: number; selfReported?: boolean };
export type ScoreCategory = {
  key: string;
  label: string;
  earned: number;
  max: number;
  lines: ScoreLine[];
  improve: string | null;
};

export const PRACTICE_LABELS: Record<PracticeId, string> = {
  plastic_free_packaging: 'Plastic-free packaging',
  compostable_packaging: 'Compostable packaging',
  reusable_containers: 'Takes back reusable containers',
  renewable_energy: 'Renewable energy on the farm',
  cover_crops: 'Cover crops',
  no_till: 'No-till or low-till',
  integrated_pest_mgmt: 'Integrated pest management',
  water_conservation: 'Water conservation (drip, rain capture)',
  composts_waste: 'Composts unsold food and scraps',
  donates_surplus: 'Donates surplus to food rescue',
  pasture_raised: 'Pasture-raised animals',
  pesticide_free: 'No synthetic pesticides',
};

export const SCORE_RULES = {
  certification: { max: 20, verified: 20, selfReported: 10 },
  packaging: {
    max: 15,
    points: { plastic_free_packaging: 10, compostable_packaging: 6, reusable_containers: 8 } as Partial<
      Record<PracticeId, number>
    >,
  },
  foodMiles: {
    max: 20,
    bands: [
      { upTo: 25, points: 20 },
      { upTo: 50, points: 15 },
      { upTo: 100, points: 10 },
      { upTo: 250, points: 5 },
    ],
  },
  waste: {
    max: 15,
    points: { composts_waste: 8, donates_surplus: 10 } as Partial<Record<PracticeId, number>>,
  },
  growing: {
    max: 15,
    each: 3,
    practices: [
      'cover_crops',
      'no_till',
      'integrated_pest_mgmt',
      'water_conservation',
      'renewable_energy',
      'pasture_raised',
      'pesticide_free',
    ] as PracticeId[],
  },
  benefits: {
    max: 15,
    points: { snap: 7, hip: 5, wic_fmnp: 3, sfmnp: 3 } as Partial<Record<ProgramId, number>>,
  },
} as const;

const cap = (lines: ScoreLine[], max: number) =>
  Math.min(
    max,
    lines.reduce((s, l) => s + l.points, 0),
  );

function practiceLines(input: ScoreInput, table: Partial<Record<PracticeId, number>>): ScoreLine[] {
  return input.practices
    .filter((p) => table[p.id] !== undefined)
    .map((p) => ({ label: PRACTICE_LABELS[p.id], points: table[p.id]!, selfReported: p.selfReported }));
}

export function scoreBreakdown(input: ScoreInput): ScoreCategory[] {
  const R = SCORE_RULES;

  const best = input.certifications.find((c) => c.verified) ?? input.certifications[0];
  const certLines: ScoreLine[] = best
    ? [
        {
          label: best.label,
          points: best.verified ? R.certification.verified : R.certification.selfReported,
          selfReported: !best.verified,
        },
      ]
    : [];

  const pack = practiceLines(input, R.packaging.points);
  const waste = practiceLines(input, R.waste.points);
  const grow = input.practices
    .filter((p) => R.growing.practices.includes(p.id))
    .map((p) => ({ label: PRACTICE_LABELS[p.id], points: R.growing.each, selfReported: p.selfReported }));

  const band =
    input.foodMiles === undefined ? undefined : R.foodMiles.bands.find((b) => input.foodMiles! <= b.upTo);
  const milesLines: ScoreLine[] =
    input.foodMiles === undefined
      ? []
      : [
          {
            label: `Farm is about ${Math.round(input.foodMiles)} miles from market`,
            points: band?.points ?? 0,
          },
        ];

  const benefitLines: ScoreLine[] = input.programs
    .filter((p) => R.benefits.points[p] !== undefined)
    .map((p) => ({
      label: `Accepts ${p === 'wic_fmnp' ? 'WIC coupons' : p === 'sfmnp' ? 'Senior coupons' : p.toUpperCase()}`,
      points: R.benefits.points[p]!,
    }));

  const cats: Omit<ScoreCategory, 'earned'>[] = [
    {
      key: 'certification',
      label: 'Certification',
      max: R.certification.max,
      lines: certLines,
      improve: !best
        ? 'Get certified (USDA Organic or Certified Naturally Grown) and upload proof.'
        : !best.verified
          ? 'Upload your certificate so we can verify it for full points.'
          : null,
    },
    {
      key: 'packaging',
      label: 'Packaging',
      max: R.packaging.max,
      lines: pack,
      improve: 'Switch to plastic-free packaging or take back reusable containers.',
    },
    {
      key: 'foodMiles',
      label: 'Food miles',
      max: R.foodMiles.max,
      lines: milesLines,
      improve:
        input.foodMiles === undefined
          ? 'Add your farm location so we can estimate food miles.'
          : 'Sell at markets closer to your farm.',
    },
    {
      key: 'waste',
      label: 'Waste diversion',
      max: R.waste.max,
      lines: waste,
      improve: 'Compost unsold food, or list end-of-day surplus for donation.',
    },
    {
      key: 'growing',
      label: 'Growing practices',
      max: R.growing.max,
      lines: grow,
      improve: 'Add practices like cover crops or drip irrigation to your profile.',
    },
    {
      key: 'benefits',
      label: 'Food-access programs',
      max: R.benefits.max,
      lines: benefitLines,
      improve: 'Accept SNAP and HIP so more neighbors can shop with you.',
    },
  ];
  return cats.map((c) => {
    const earned = cap(c.lines, c.max);
    return { ...c, earned, improve: earned >= c.max ? null : c.improve };
  });
}

export const sustainabilityScore = (input: ScoreInput) =>
  scoreBreakdown(input).reduce((s, c) => s + c.earned, 0);
