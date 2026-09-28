import type { Currency } from './money';
import type { Period } from './periods';

/** The amount the player typed, which every other cell is worked out from. */
export interface Base {
  amount: number;
  currency: Currency;
  period: Period;
}

/** Value of one unit of each currency in BRL (so BRL is 1). */
export type Rates = Record<Currency, number>;

/**
 * Converts the base amount to another period and currency. Returns null when that needs exchange
 * rates and there are none.
 */
export function convert(
  base: Base,
  to: { currency: Currency; period: Period },
  hours: Record<Period, number>,
  rates: Rates | null,
): number | null {
  const sameCurrency = to.currency === base.currency;
  if (!sameCurrency && !rates) return null;
  const exchange = sameCurrency ? 1 : rates![base.currency] / rates![to.currency];
  return (base.amount / hours[base.period]) * hours[to.period] * exchange;
}
