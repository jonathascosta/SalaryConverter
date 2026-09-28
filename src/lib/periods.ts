export const PERIODS = ['hour', 'day', 'week', 'month', 'year'] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  hour: 'Hourly',
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Yearly',
};

export const isPeriod = (value: unknown): value is Period => PERIODS.includes(value as Period);

/** How long each period is, in working time. */
export interface WorkTime {
  hoursPerDay: number;
  daysPerWeek: number;
  daysPerMonth: number;
  /** 12 by default; 14 where a year pays 14 salaries (Portugal), 13.33 for Brazil's 13th salary and holiday bonus. */
  monthsPerYear: number;
}

export type WorkTimeKey = keyof WorkTime;

export const DEFAULT_WORK_TIME: WorkTime = { hoursPerDay: 8, daysPerWeek: 5, daysPerMonth: 20, monthsPerYear: 12 };

export const WORK_TIME_LIMITS: Record<WorkTimeKey, number> = {
  hoursPerDay: 24,
  daysPerWeek: 7,
  daysPerMonth: 31,
  monthsPerYear: 24,
};

export const isValidWorkTime = (key: WorkTimeKey, value: number): boolean =>
  Number.isFinite(value) && value > 0 && value <= WORK_TIME_LIMITS[key];

/** The length of every period in hours. */
export function hoursIn(time: WorkTime): Record<Period, number> {
  const day = time.hoursPerDay;
  const month = time.daysPerMonth * day;
  return { hour: 1, day, week: time.daysPerWeek * day, month, year: time.monthsPerYear * month };
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Converts the settings of the first version of the app, saved as {"day": "8h", "week": "5d",
 * "month": "20d", "year": "12m"}, where each period could be defined in any other unit.
 * Returns null when they can't be read.
 */
export function fromEquivalences(saved: unknown): WorkTime | null {
  if (typeof saved !== 'object' || saved === null) return null;
  const units: Record<string, string> = { h: 'hour', d: 'day', w: 'week', m: 'month', y: 'year' };
  const definitions: Record<string, string> = { day: '8h', week: '5d', month: '20d', year: '12m' };
  for (const [period, text] of Object.entries(saved)) {
    if (period in definitions && typeof text === 'string' && /^\d+(\.\d+)?[hdwmy]$/.test(text)) {
      definitions[period] = text;
    }
  }

  const hours: Record<string, number> = { hour: 1 };
  const resolve = (period: string, seen: Set<string>): number => {
    if (hours[period]) return hours[period];
    if (seen.has(period) || !(period in definitions)) throw new Error(`Can't resolve ${period}`);
    seen.add(period);
    const text = definitions[period];
    hours[period] = parseFloat(text) * resolve(units[text.at(-1)!], seen);
    return hours[period];
  };

  try {
    for (const period of Object.keys(definitions)) resolve(period, new Set());
  } catch {
    return null;
  }

  const time: WorkTime = {
    hoursPerDay: round(hours.day),
    daysPerWeek: round(hours.week / hours.day),
    daysPerMonth: round(hours.month / hours.day),
    monthsPerYear: round(hours.year / hours.month),
  };
  return (Object.keys(time) as WorkTimeKey[]).every((key) => isValidWorkTime(key, time[key])) ? time : null;
}
