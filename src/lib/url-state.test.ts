import { describe, expect, it } from 'vitest';
import { DEFAULT_WORK_TIME } from './periods';
import { readState, writeState } from './url-state';

describe('URL state', () => {
  it('reads a shared link', () => {
    expect(readState('?amount=3000&currency=eur&period=Month&monthsPerYear=14')).toEqual({
      base: { amount: 3000, currency: 'EUR', period: 'month' },
      workTime: { monthsPerYear: 14 },
    });
  });

  it('ignores what it cannot use', () => {
    expect(readState('')).toEqual({ base: null, workTime: {} });
    expect(readState('?amount=abc&currency=EUR&period=month').base).toBeNull();
    expect(readState('?amount=10&currency=JPY&period=month').base).toBeNull();
    expect(readState('?amount=10&currency=EUR&period=fortnight').base).toBeNull();
    expect(readState('?hoursPerDay=30&daysPerWeek=4').workTime).toEqual({ daysPerWeek: 4 });
  });

  it('writes only what differs from the defaults', () => {
    const base = { amount: 3000.456, currency: 'EUR', period: 'month' } as const;
    expect(writeState(base, DEFAULT_WORK_TIME)).toBe('?amount=3000.46&currency=EUR&period=month');
    expect(writeState(null, { ...DEFAULT_WORK_TIME, hoursPerDay: 7.5 })).toBe('?hoursPerDay=7.5');
    expect(writeState(null, DEFAULT_WORK_TIME)).toBe('');
  });

  it('round-trips', () => {
    const base = { amount: 42.5, currency: 'GBP', period: 'hour' } as const;
    const workTime = { ...DEFAULT_WORK_TIME, daysPerMonth: 21.67, monthsPerYear: 13.33 };
    const state = readState(writeState(base, workTime));
    expect(state.base).toEqual(base);
    expect({ ...DEFAULT_WORK_TIME, ...state.workTime }).toEqual(workTime);
  });
});
