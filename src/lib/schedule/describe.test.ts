import { describeMonthDay, describeRule } from './describe';

describe('describeRule', () => {
  it.each([
    ['FREQ=WEEKLY;BYDAY=SA', 'Saturdays'],
    ['FREQ=WEEKLY;BYDAY=TU,FR', 'Tuesdays and Fridays'],
    ['FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA', 'Monday–Saturday'],
    ['FREQ=MONTHLY;BYDAY=1WE,3WE', '1st and 3rd Wednesday of the month'],
    ['FREQ=MONTHLY;BYDAY=-1SA', 'last Saturday of the month'],
    ['FREQ=WEEKLY;INTERVAL=2;BYDAY=SU', 'Every other Sunday'],
  ])('%s', (r, text) => expect(describeRule(r)).toBe(text));
  it('Spanish', () => expect(describeRule('FREQ=WEEKLY;BYDAY=TU,FR', 'es')).toBe('Los martes y viernes'));
  it('month-days', () => expect(describeMonthDay('06-14')).toBe('June 14'));
});
