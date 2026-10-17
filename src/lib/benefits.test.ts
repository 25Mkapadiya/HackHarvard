import programs from '../../data/manual/programs.json';
import type { Program } from '../types';
import { hipCap, hipRefund } from './benefits';

const hip = (programs as Program[]).find((p) => p.id === 'hip')!;

describe('HIP calculator', () => {
  it.each([
    [1, 40],
    [2, 40],
    [3, 60],
    [5, 60],
    [6, 80],
    [9, 80],
  ])('household of %i → $%i a month', (size, cap) => expect(hipCap(hip, size)).toBe(cap));

  it('refunds dollar for dollar up to the cap', () => {
    expect(hipRefund(25, 40)).toBe(25);
    expect(hipRefund(55, 40)).toBe(40);
  });
  it('accounts for what was already earned this month', () => {
    expect(hipRefund(30, 40, 25)).toBe(15);
    expect(hipRefund(30, 40, 40)).toBe(0);
  });
  it('ignores negative spend', () => expect(hipRefund(-5, 40)).toBe(0));
  it('returns null for programs without a cap', () => {
    expect(
      hipCap(
        (programs as Program[]).find((p) => p.id === 'snap')!,
        3,
      ),
    ).toBeNull();
  });
});
