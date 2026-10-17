import type { MarketSchedule } from '../../types';
import { marketStatus, nextOpening, occursOn, upcoming } from './occurs';
import { parseSchedule } from './parse';

// Instants are given in UTC; comments show Boston wall-clock time.
const sat: MarketSchedule = {
  rrule: 'FREQ=WEEKLY;BYDAY=SA',
  openTime: '09:00',
  closeTime: '13:00',
  seasonStart: '05-01',
  seasonEnd: '10-31',
};

describe('marketStatus', () => {
  it('open on a Saturday morning in season', () => {
    // Sat 2026-06-13 10:00 EDT
    expect(marketStatus([sat], true, new Date('2026-06-13T14:00:00Z'))).toMatchObject({
      state: 'open',
      closesAt: '13:00',
    });
  });
  it('closing soon within 45 minutes of close', () => {
    // 12:30 EDT
    expect(marketStatus([sat], true, new Date('2026-06-13T16:30:00Z')).state).toBe('closing_soon');
  });
  it('closed at close time, next opening a week later', () => {
    const s = marketStatus([sat], true, new Date('2026-06-13T17:00:00Z'));
    expect(s.state).toBe('closed');
    expect(s.state === 'closed' && s.next?.day).toEqual({ y: 2026, m: 6, d: 20 });
  });
  it('unknown when the schedule could not be parsed', () => {
    expect(marketStatus([], false, new Date()).state).toBe('unknown');
  });
});

describe('season boundaries', () => {
  it('first and last day are inclusive', () => {
    expect(occursOn(sat, { y: 2026, m: 10, d: 31 })).toBe(true); // a Saturday
    expect(occursOn(sat, { y: 2026, m: 11, d: 7 })).toBe(false);
    expect(occursOn({ ...sat, seasonStart: '05-02' }, { y: 2026, m: 5, d: 2 })).toBe(true);
  });
  it('winter seasons wrap the new year', () => {
    const winter: MarketSchedule = { ...sat, seasonStart: '11-01', seasonEnd: '04-30' };
    expect(occursOn(winter, { y: 2026, m: 12, d: 5 })).toBe(true);
    expect(occursOn(winter, { y: 2027, m: 1, d: 2 })).toBe(true);
    expect(occursOn(winter, { y: 2026, m: 6, d: 13 })).toBe(false);
  });
  it('next opening skips the off-season', () => {
    // Sun 2026-11-01 → next season starts May 2027; first Saturday is May 1.
    const next = nextOpening([sat], new Date('2026-11-01T15:00:00Z'), [], 200);
    expect(next?.day).toEqual({ y: 2027, m: 5, d: 1 });
  });
});

describe('DST changes', () => {
  it('9 am stays 9 am across the November fall-back', () => {
    // DST ends Sun 2026-11-01. Saturday 10-31 9:30 EDT = 13:30Z; year-round market.
    const yr = { ...sat, seasonStart: undefined, seasonEnd: undefined };
    expect(marketStatus([yr], true, new Date('2026-10-31T13:30:00Z')).state).toBe('open');
    // Saturday 11-07 9:30 EST = 14:30Z; 13:30Z is 8:30 EST → closed.
    expect(marketStatus([yr], true, new Date('2026-11-07T14:30:00Z')).state).toBe('open');
    expect(marketStatus([yr], true, new Date('2026-11-07T13:30:00Z')).state).toBe('closed');
  });
  it('spring-forward Sunday market opens at local 10:00', () => {
    // DST starts Sun 2027-03-14. 10:15 EDT = 14:15Z.
    const sun: MarketSchedule = { rrule: 'FREQ=WEEKLY;BYDAY=SU', openTime: '10:00', closeTime: '14:00' };
    expect(marketStatus([sun], true, new Date('2027-03-14T14:15:00Z')).state).toBe('open');
    expect(marketStatus([sun], true, new Date('2027-03-14T13:45:00Z')).state).toBe('closed');
  });
});

describe('closures and exceptions', () => {
  it('yearly "no market" exceptions from source data', () => {
    const r = parseSchedule('Saturday, 9:00 am - 1:00 pm', 'June 20 to October 10 (no market 7/4)');
    expect(occursOn(r.schedules[0], { y: 2026, m: 7, d: 4 })).toBe(false);
    expect(occursOn(r.schedules[0], { y: 2026, m: 7, d: 11 })).toBe(true);
  });
  it('one-off manager closures override "open now"', () => {
    const now = new Date('2026-06-13T14:00:00Z');
    expect(marketStatus([sat], true, now, ['2026-06-13']).state).toBe('closed');
  });
});

describe('monthly and biweekly rules', () => {
  it('first and third Wednesday', () => {
    const r: MarketSchedule = { rrule: 'FREQ=MONTHLY;BYDAY=1WE,3WE', openTime: '11:00', closeTime: '15:00' };
    const days = upcoming([r], new Date('2026-07-01T04:00:00Z'), 31).map((o) => o.day.d);
    expect(days).toEqual([1, 15]);
  });
  it('every other Saturday is anchored to the season start', () => {
    const r = parseSchedule('Saturday, 11:00 am - 2:00 pm', 'Every other Saturday, January 28 to April 8')
      .schedules[0];
    // Season starts 01-28; in 2027 the first Saturday on/after is Jan 30, then Feb 13.
    expect(occursOn(r, { y: 2027, m: 1, d: 30 })).toBe(true);
    expect(occursOn(r, { y: 2027, m: 2, d: 6 })).toBe(false);
    expect(occursOn(r, { y: 2027, m: 2, d: 13 })).toBe(true);
  });
  it('explicit date lists', () => {
    const r = parseSchedule('Saturday, 10:00 am - 1:00 pm', '11/12, 12/10, 1/14').schedules[0];
    expect(occursOn(r, { y: 2026, m: 12, d: 10 })).toBe(true);
    expect(occursOn(r, { y: 2026, m: 12, d: 17 })).toBe(false);
  });
});
