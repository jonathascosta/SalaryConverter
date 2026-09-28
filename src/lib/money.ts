export const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_NAMES: Record<Currency, string> = {
  BRL: 'Brazilian real',
  USD: 'US dollar',
  EUR: 'Euro',
  GBP: 'Pound sterling',
};

/** For labels such as "Monthly, in euros". */
export const CURRENCY_PLURALS: Record<Currency, string> = {
  BRL: 'Brazilian reais',
  USD: 'US dollars',
  EUR: 'euros',
  GBP: 'pounds sterling',
};

export const isCurrency = (value: unknown): value is Currency => CURRENCIES.includes(value as Currency);

const formats = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = formats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    formats.set(key, format);
  }
  return format;
}

/** The decimal separator of a locale: "." in en-US, "," in pt-BR, pt-PT or de-DE. */
export function decimalSeparator(locale: string): string {
  return numberFormat(locale, {}).formatToParts(1.5).find((part) => part.type === 'decimal')?.value ?? '.';
}

/** "R$15,000.00" in en-US, "15 000,00 €" in pt-PT. */
export const formatMoney = (value: number, currency: Currency, locale: string): string =>
  numberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(value);

/** A number as the player would type it: no grouping, up to two decimals ("15000", "2918,29"). */
export const formatPlain = (value: number, locale: string): string =>
  numberFormat(locale, { useGrouping: false, maximumFractionDigits: 2 }).format(value);

/**
 * Reads an amount typed in any common style: "3000", "3,000.50", "3.000,50", "R$ 3.000", "25,5".
 * Returns null when the text is not a number, or is negative.
 *
 * A single separator followed by exactly three digits ("3.000", "3,000") could be either a
 * thousands or a decimal separator; the locale decides.
 */
export function parseAmount(text: string, locale: string): number | null {
  if (text.includes('-')) return null;
  // Drop spaces (\s includes the non-breaking ones Intl uses), apostrophes used for grouping,
  // and currency symbols or codes at either end.
  const s = text
    .replace(/[\s']/g, '')
    .replace(/^[^\d.,]+/, '')
    .replace(/[^\d.,]+$/, '');
  if (!/^[\d.,]+$/.test(s)) return null;

  const dots = s.split('.').length - 1;
  const commas = s.split(',').length - 1;
  let decimal: '.' | ',' | null = null;

  if (dots && commas) {
    decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
  } else if (dots + commas === 1) {
    const separator = dots ? '.' : ',';
    const digitsAfter = s.length - s.indexOf(separator) - 1;
    decimal = digitsAfter !== 3 || decimalSeparator(locale) === separator ? separator : null;
  }

  const cut = decimal ? s.lastIndexOf(decimal) : s.length;
  if (decimal && s.slice(0, cut).includes(decimal)) return null;
  const whole = s.slice(0, cut).replace(/[.,]/g, '');
  const fraction = s.slice(cut + 1);
  if (/[.,]/.test(fraction) || (!whole && !fraction)) return null;

  const value = Number(`${whole || '0'}.${fraction || '0'}`);
  return Number.isFinite(value) && value < 1e13 ? value : null;
}
