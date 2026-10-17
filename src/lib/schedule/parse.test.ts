import { parseDayTime, parseSchedule, parseSeason, parseTimeRange } from './parse';

// Every string below is copied verbatim from the MassGIS / MDAR farmers market layer.

describe('parseTimeRange', () => {
  it.each([
    ['9:00 am - 2:00 pm', '09:00', '14:00'],
    ['2:30 pm - 6:30pm', '14:30', '18:30'],
    ['10:00 am to 1:00 pm', '10:00', '13:00'],
    ['12:00 pm - 5:00 pm', '12:00', '17:00'],
    ['12:00 - 5:00 pm', '12:00', '17:00'],
    ['10:00 am -1:00 pm', '10:00', '13:00'],
    ['4:00 pm- 8:00 pm', '16:00', '20:00'],
  ])('%s', (input, open, close) => {
    expect(parseTimeRange(input)).toEqual({ openTime: open, closeTime: close });
  });
  it('rejects a close before open', () => expect(parseTimeRange('5:00 pm - 2:00 pm')).toBeNull());
});

describe('parseDayTime (real strings)', () => {
  it.each([
    ['Saturday, 9:00 am - 2:00 pm', [['FREQ=WEEKLY;BYDAY=SA', '09:00', '14:00']]],
    ['Friday 10:00 am - 2:00 pm', [['FREQ=WEEKLY;BYDAY=FR', '10:00', '14:00']]],
    ['Saturdays, 10:00 am to 12:00 pm', [['FREQ=WEEKLY;BYDAY=SA', '10:00', '12:00']]],
    ['Monday, Noon  - 6:00 pm', [['FREQ=WEEKLY;BYDAY=MO', '12:00', '18:00']]],
    ['Saturday, 9:00 am - Noon', [['FREQ=WEEKLY;BYDAY=SA', '09:00', '12:00']]],
    ['Third Sunday, 10:00 am – 2:00 pm', [['FREQ=MONTHLY;BYDAY=3SU', '10:00', '14:00']]],
    ['First and Third Wednesday, 11:00 am - 3:00 pm', [['FREQ=MONTHLY;BYDAY=1WE,3WE', '11:00', '15:00']]],
    ['2nd and 4th Fridays, 10:00 am - 2:00 pm', [['FREQ=MONTHLY;BYDAY=2FR,4FR', '10:00', '14:00']]],
    ['Last Saturday of the Month, 10:00 am - 1:00 pm', [['FREQ=MONTHLY;BYDAY=-1SA', '10:00', '13:00']]],
    ['Third Friday of the Month, 4:00 pm- 8:00 pm', [['FREQ=MONTHLY;BYDAY=3FR', '16:00', '20:00']]],
    [
      'First and third Saturday of each month, from 10:00 am - 2:00 pm',
      [['FREQ=MONTHLY;BYDAY=1SA,3SA', '10:00', '14:00']],
    ],
    ['Every other Sunday, 9:00 am - 1:00 pm', [['FREQ=WEEKLY;INTERVAL=2;BYDAY=SU', '09:00', '13:00']]],
    ['Wednesday to Sunday, 11:00 am - 7:00  pm', [['FREQ=WEEKLY;BYDAY=WE,TH,FR,SA,SU', '11:00', '19:00']]],
    ['Tuesday and Friday, 11:00 am to 6:00 pm', [['FREQ=WEEKLY;BYDAY=TU,FR', '11:00', '18:00']]],
    [
      'Thursday, 4:00 pm - 7:00 pm and Saturday, 10:00 am - 1:00pm',
      [
        ['FREQ=WEEKLY;BYDAY=TH', '16:00', '19:00'],
        ['FREQ=WEEKLY;BYDAY=SA', '10:00', '13:00'],
      ],
    ],
    [
      'Tuesday, 12:00 - 5:00 pm and Saturday, Noon -3:00 pm',
      [
        ['FREQ=WEEKLY;BYDAY=TU', '12:00', '17:00'],
        ['FREQ=WEEKLY;BYDAY=SA', '12:00', '15:00'],
      ],
    ],
    [
      'Monday to Saturday, 8:00 am - 6:00 pm; Sunday, 10:00 am - 6:00pm',
      [
        ['FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA', '08:00', '18:00'],
        ['FREQ=WEEKLY;BYDAY=SU', '10:00', '18:00'],
      ],
    ],
    [
      'Saturday, 8:00 am - 12:00 pm (Fall hours after Labor Day: 9:00 am - 12:00 pm)',
      [['FREQ=WEEKLY;BYDAY=SA', '08:00', '12:00']],
    ],
    [
      'Saturday, 10:00 am - 1:00 pm; Night Events, 5:00 pm - 8:00 pm',
      [['FREQ=WEEKLY;BYDAY=SA', '10:00', '13:00']],
    ],
    [
      'Saturday, 10:00 am - 1:00 pm\n\n Saturday, 10:00 am -1:00 pm',
      [['FREQ=WEEKLY;BYDAY=SA', '10:00', '13:00']],
    ],
    [
      'Thursday, 2:00 pm - 6:00 pm; Pre-order Fridays through Wednesdays by 1pm, and Pick up on all market dates.',
      [['FREQ=WEEKLY;BYDAY=TH', '14:00', '18:00']],
    ],
  ])('%s', (input, expected) => {
    expect(parseDayTime(input)).toEqual(
      expected.map(([rrule, openTime, closeTime]) => ({ rrule, openTime, closeTime })),
    );
  });
});

describe('parseSeason (real strings)', () => {
  it('month-day range', () => {
    expect(parseSeason('June 14 to October 25')?.ranges).toEqual([{ start: '06-14', end: '10-25' }]);
  });
  it('double space and missing "to"', () => {
    expect(parseSeason('June 1 to August  31')?.ranges).toEqual([{ start: '06-01', end: '08-31' }]);
    expect(parseSeason('May 26  October 20')?.ranges).toEqual([{ start: '05-26', end: '10-20' }]);
  });
  it('month-only and fuzzy edges', () => {
    expect(parseSeason('May to October')?.ranges).toEqual([{ start: '05-01', end: '10-31' }]);
    expect(parseSeason('Late June to October')?.ranges).toEqual([{ start: '06-20', end: '10-31' }]);
    expect(parseSeason('July to Mid October')?.ranges).toEqual([{ start: '07-01', end: '10-15' }]);
    expect(parseSeason('November to April 26')?.ranges).toEqual([{ start: '11-01', end: '04-26' }]);
  });
  it('year-round variants', () => {
    expect(parseSeason('Year-Round')?.ranges).toEqual([{}]);
    expect(parseSeason('year-round')?.ranges).toEqual([{}]);
  });
  it('no-market exceptions', () => {
    const s = parseSeason('June 5 to October 2, No market 7/3 and 9/4');
    expect(s?.ranges).toEqual([{ start: '06-05', end: '10-02' }]);
    expect(s?.exceptions.map((e) => e.date)).toEqual(['07-03', '09-04']);
    expect(
      parseSeason('December 2 to March 25 (no makret 12/24 & 12/31)')?.exceptions.map((e) => e.date),
    ).toEqual(['12-24', '12-31']);
    expect(parseSeason('November 5 to April 8; No market 11/26, 12/24, 12/31')?.exceptions).toHaveLength(3);
  });
  it('two ranges', () => {
    expect(parseSeason('November 2 to December 21 and January 11 to March 29')?.ranges).toEqual([
      { start: '11-02', end: '12-21' },
      { start: '01-11', end: '03-29' },
    ]);
  });
  it('range plus an extra date', () => {
    const s = parseSeason('June 18 to October 15 and 11/19');
    expect(s?.extraDates).toEqual(['11-19']);
    expect(parseSeason('June 17 to October 14 and Nov. 18')?.extraDates).toEqual(['11-18']);
  });
  it('explicit date lists', () => {
    expect(parseSeason('11/12, 12/10, 1/14, 2/11, 3/11')?.dates).toEqual([
      '11-12',
      '12-10',
      '01-14',
      '02-11',
      '03-11',
    ]);
    expect(parseSeason('11/19, 12/17, 1/21 2/18, 3/18, 4/15')?.dates).toHaveLength(6);
    expect(parseSeason('October 23, November 12, December 11')?.dates).toEqual(['10-23', '11-12', '12-11']);
  });
  it('keeps unexplained parentheticals as a note', () => {
    expect(parseSeason('December 3 to March 25 (Mkt is every other week in January)')?.note).toBe(
      'Mkt is every other week in January',
    );
  });
  it.each([
    'TBA',
    'June53 to September 25',
    'June 20 to October 231',
    'Tuesday, Mid June to November; Saturday, year-round',
  ])('refuses to guess: %s', (input) => expect(parseSeason(input)).toBeNull());
});

describe('parseSchedule', () => {
  it('applies a leading season modifier to the weekday', () => {
    const r = parseSchedule('Saturday, 11:00 am - 2:00 pm', 'Every other Saturday, January 28 to April 8');
    expect(r.parsed).toBe(true);
    expect(r.schedules[0]).toMatchObject({ rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=SA', seasonStart: '01-28' });
  });
  it('First Saturday of the month in the season text', () => {
    const r = parseSchedule(
      'Saturday, 9:00 am - 12:00 pm',
      'First Saturday of the month, June 4 to October 1',
    );
    expect(r.schedules[0].rrule).toBe('FREQ=MONTHLY;BYDAY=1SA');
  });
  it('fails closed on a mismatched weekday modifier', () => {
    expect(
      parseSchedule('Sunday, 9:00 am - 12:00 pm', 'Every other Saturday, January 28 to April 8').parsed,
    ).toBe(false);
  });
  it('fails on unparseable text and keeps the raw string', () => {
    const r = parseSchedule(
      'Thursday, 2:00 pm - 6:00 pm',
      '11/21, 12/22 and then 2nd Thursday of the month,until May',
    );
    expect(r.parsed).toBe(false);
    expect(r.raw).toContain('2nd Thursday');
  });
  it('creates one schedule per day segment and season range', () => {
    const r = parseSchedule(
      'Thursday, 4:00 pm - 7:00 pm and Saturday, 10:00 am - 1:00pm',
      'November 2 to December 21 and January 11 to March 29',
    );
    expect(r.schedules).toHaveLength(4);
  });
});
