import type { Program } from '../types';

// HIP: SNAP spent on eligible fruits and vegetables at a HIP vendor is refunded 1:1,
// up to a monthly cap by household size. Caps come from programs.json, never hard-coded here.

export function hipCap(program: Program, householdSize: number): number | null {
  const cap = program.monthlyCap;
  if (cap === undefined) return null;
  if (typeof cap === 'number') return cap;
  for (const [range, amount] of Object.entries(cap)) {
    const plus = /^(\d+)\+$/.exec(range);
    if (plus && householdSize >= Number(plus[1])) return amount;
    const span = /^(\d+)-(\d+)$/.exec(range);
    if (span && householdSize >= Number(span[1]) && householdSize <= Number(span[2])) return amount;
    if (/^\d+$/.test(range) && Number(range) === householdSize) return amount;
  }
  return null;
}

/** Refund for a purchase, given what the household has already earned this month. */
export function hipRefund(spend: number, cap: number, earnedThisMonth = 0, matchRate = 1): number {
  const room = Math.max(0, cap - earnedThisMonth);
  return Math.round(Math.min(Math.max(0, spend) * matchRate, room) * 100) / 100;
}
