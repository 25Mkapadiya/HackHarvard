import { DemoStore } from './demo';
import { dayToken } from './token';

describe('DemoStore', () => {
  beforeEach(() => localStorage.clear());

  it('awards one check-in per market per day', async () => {
    const s = new DemoStore();
    const t = dayToken('m1', '2026-06-13');
    expect(await s.checkIn('m1', t, '2026-06-13')).toEqual({ ok: true, points: 10 });
    expect(await s.checkIn('m1', t, '2026-06-13')).toEqual({ ok: false, reason: 'already' });
    expect((await s.load()).checkins).toHaveLength(1);
  });

  it('rejects a token for another day', async () => {
    const s = new DemoStore();
    expect(await s.checkIn('m1', dayToken('m1', '2026-06-12'), '2026-06-13')).toEqual({
      ok: false,
      reason: 'bad_token',
    });
  });

  it('does not store benefit details unless the user opts in', async () => {
    const s = new DemoStore();
    await s.savePrefs({ householdSize: 4, programs: ['snap'] });
    expect((await s.load()).prefs).toEqual({ home: undefined });
    await s.savePrefs({ rememberBenefits: true, householdSize: 4 });
    expect((await s.load()).prefs.householdSize).toBe(4);
  });

  it('clears everything', async () => {
    const s = new DemoStore();
    await s.saveMarketOverride('m1', { closures: [{ date: '2026-06-13', note: 'Rain' }] });
    await s.clearAll();
    expect((await s.load()).marketOverrides).toEqual({});
  });
});
