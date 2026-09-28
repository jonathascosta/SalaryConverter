import { describe, expect, it } from 'vitest';
import { DEFAULT_WORK_TIME, fromEquivalences, hoursIn, isValidWorkTime } from './periods';

describe('hoursIn', () => {
  it('uses 8-hour days, 5-day weeks, 20-day months and 12-month years by default', () => {
    expect(hoursIn(DEFAULT_WORK_TIME)).toEqual({ hour: 1, day: 8, week: 40, month: 160, year: 1920 });
  });

  it('pays extra months when a year has more than twelve salaries', () => {
    expect(hoursIn({ ...DEFAULT_WORK_TIME, monthsPerYear: 14 }).year).toBe(14 * 160);
  });
});

describe('isValidWorkTime', () => {
  it('accepts positive values within each limit', () => {
    expect(isValidWorkTime('hoursPerDay', 7.5)).toBe(true);
    expect(isValidWorkTime('hoursPerDay', 0)).toBe(false);
    expect(isValidWorkTime('hoursPerDay', 25)).toBe(false);
    expect(isValidWorkTime('daysPerWeek', 8)).toBe(false);
    expect(isValidWorkTime('monthsPerYear', 13.33)).toBe(true);
    expect(isValidWorkTime('daysPerMonth', Number.NaN)).toBe(false);
  });
});

describe('fromEquivalences (settings of the first version)', () => {
  it('reads the old defaults', () => {
    expect(fromEquivalences({ day: '8h', week: '5d', month: '20d', year: '12m' })).toEqual(DEFAULT_WORK_TIME);
  });

  it('resolves periods defined through other periods', () => {
    expect(fromEquivalences({ day: '6h', month: '4.33w' })).toEqual({
      hoursPerDay: 6,
      daysPerWeek: 5,
      daysPerMonth: 21.65,
      monthsPerYear: 12,
    });
  });

  it('gives up on circular or unusable settings', () => {
    expect(fromEquivalences({ day: '1w', week: '5d' })).toBeNull();
    expect(fromEquivalences('8h')).toBeNull();
    expect(fromEquivalences({ day: '30h' })).toBeNull();
  });

  it('ignores values it cannot read', () => {
    expect(fromEquivalences({ day: 'eight hours', year: 12 })).toEqual(DEFAULT_WORK_TIME);
  });
});
