import { describe, expect, it } from 'vitest';
import { convert, type Rates } from './convert';
import { DEFAULT_WORK_TIME, hoursIn } from './periods';

const hours = hoursIn(DEFAULT_WORK_TIME);
const rates: Rates = { BRL: 1, USD: 5, EUR: 5.5, GBP: 6.5 };
const base = { amount: 3000, currency: 'EUR', period: 'month' } as const;

describe('convert', () => {
  it('converts between periods', () => {
    expect(convert(base, { currency: 'EUR', period: 'hour' }, hours, rates)).toBeCloseTo(18.75);
    expect(convert(base, { currency: 'EUR', period: 'year' }, hours, rates)).toBeCloseTo(36_000);
    expect(convert(base, { currency: 'EUR', period: 'month' }, hours, rates)).toBe(3000);
  });

  it('converts between currencies through their BRL rates', () => {
    expect(convert(base, { currency: 'BRL', period: 'month' }, hours, rates)).toBeCloseTo(16_500);
    expect(convert(base, { currency: 'USD', period: 'month' }, hours, rates)).toBeCloseTo(3300);
    expect(convert(base, { currency: 'GBP', period: 'week' }, hours, rates)).toBeCloseTo((3000 / 4) * (5.5 / 6.5));
  });

  it('still converts periods without exchange rates', () => {
    expect(convert(base, { currency: 'EUR', period: 'day' }, hours, null)).toBeCloseTo(150);
    expect(convert(base, { currency: 'USD', period: 'day' }, hours, null)).toBeNull();
  });
});
