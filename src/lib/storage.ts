import type { Base } from './convert';
import { isCurrency } from './money';
import { DEFAULT_WORK_TIME, fromEquivalences, isPeriod, isValidWorkTime, type WorkTime, type WorkTimeKey } from './periods';

const BASE_KEY = 'salary-converter:base';
const WORK_TIME_KEY = 'salary-converter:work-time';
/** Where the first version of the app kept its settings. */
const LEGACY_KEY = 'equivalences';

// Storage can be unavailable (private browsing, blocked cookies): the app still works, it just forgets.
function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore: see above.
  }
}

export function loadBase(): Base | null {
  const base = read(BASE_KEY) as Partial<Base> | null;
  return typeof base?.amount === 'number' && base.amount >= 0 && isCurrency(base.currency) && isPeriod(base.period)
    ? { amount: base.amount, currency: base.currency, period: base.period }
    : null;
}

export const saveBase = (base: Base | null): void => write(BASE_KEY, base);

export function loadWorkTime(): WorkTime {
  const saved = read(WORK_TIME_KEY) as Partial<WorkTime> | null;
  if (saved && typeof saved === 'object') {
    const time = { ...DEFAULT_WORK_TIME };
    for (const key of Object.keys(time) as WorkTimeKey[]) {
      const value = saved[key];
      if (typeof value === 'number' && isValidWorkTime(key, value)) time[key] = value;
    }
    return time;
  }
  // Settings from the first version, if any, carry over once.
  const legacy = fromEquivalences(read(LEGACY_KEY));
  if (legacy) {
    write(WORK_TIME_KEY, legacy);
    write(LEGACY_KEY, null);
  }
  return legacy ?? { ...DEFAULT_WORK_TIME };
}

export const saveWorkTime = (time: WorkTime): void => write(WORK_TIME_KEY, time);
