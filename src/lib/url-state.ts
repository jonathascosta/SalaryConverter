import type { Base } from './convert';
import { isCurrency } from './money';
import { DEFAULT_WORK_TIME, isPeriod, isValidWorkTime, type WorkTime, type WorkTimeKey } from './periods';

/**
 * The page URL holds the amount, its currency and period, plus any working time that differs
 * from the defaults, so a link reproduces the same table:
 * ?amount=3000&currency=EUR&period=month&monthsPerYear=14
 */
export interface SharedState {
  base: Base | null;
  workTime: Partial<WorkTime>;
}

const WORK_TIME_KEYS = Object.keys(DEFAULT_WORK_TIME) as WorkTimeKey[];

export function readState(search: string): SharedState {
  const params = new URLSearchParams(search);
  const amount = Number(params.get('amount'));
  const currency = params.get('currency')?.toUpperCase();
  const period = params.get('period')?.toLowerCase();
  const base =
    params.has('amount') && Number.isFinite(amount) && amount >= 0 && isCurrency(currency) && isPeriod(period)
      ? { amount, currency, period }
      : null;

  const workTime: Partial<WorkTime> = {};
  for (const key of WORK_TIME_KEYS) {
    const value = Number(params.get(key));
    if (params.has(key) && isValidWorkTime(key, value)) workTime[key] = value;
  }
  return { base, workTime };
}

export function writeState(base: Base | null, workTime: WorkTime): string {
  const params = new URLSearchParams();
  if (base) {
    params.set('amount', String(Math.round(base.amount * 100) / 100));
    params.set('currency', base.currency);
    params.set('period', base.period);
  }
  for (const key of WORK_TIME_KEYS) {
    if (workTime[key] !== DEFAULT_WORK_TIME[key]) params.set(key, String(workTime[key]));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
