// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_WORK_TIME } from './periods';
import { loadBase, loadWorkTime, saveBase, saveWorkTime } from './storage';

beforeEach(() => localStorage.clear());

describe('storage', () => {
  it('remembers the last amount', () => {
    expect(loadBase()).toBeNull();
    saveBase({ amount: 3000, currency: 'EUR', period: 'month' });
    expect(loadBase()).toEqual({ amount: 3000, currency: 'EUR', period: 'month' });
    saveBase(null);
    expect(loadBase()).toBeNull();
    localStorage.setItem('salary-converter:base', '{"amount":"lots","currency":"EUR","period":"month"}');
    expect(loadBase()).toBeNull();
  });

  it('remembers the working time, falling back to the defaults', () => {
    expect(loadWorkTime()).toEqual(DEFAULT_WORK_TIME);
    saveWorkTime({ ...DEFAULT_WORK_TIME, monthsPerYear: 14 });
    expect(loadWorkTime()).toEqual({ ...DEFAULT_WORK_TIME, monthsPerYear: 14 });
    localStorage.setItem('salary-converter:work-time', '{"hoursPerDay":99,"daysPerWeek":4}');
    expect(loadWorkTime()).toEqual({ ...DEFAULT_WORK_TIME, daysPerWeek: 4 });
  });

  it('carries over the settings of the first version once', () => {
    localStorage.setItem('equivalences', JSON.stringify({ day: '7h', week: '5d', month: '20d', year: '12m' }));
    expect(loadWorkTime()).toEqual({ ...DEFAULT_WORK_TIME, hoursPerDay: 7 });
    expect(localStorage.getItem('equivalences')).toBeNull();
    expect(loadWorkTime()).toEqual({ ...DEFAULT_WORK_TIME, hoursPerDay: 7 });
  });
});
