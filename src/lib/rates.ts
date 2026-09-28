import type { Rates } from './convert';
import { CURRENCIES, type Currency } from './money';

/** Exchange rates as published by the Central Bank of Brazil (PTAX selling rates, in BRL). */
export interface RateSheet {
  rates: Rates;
  /** When the Central Bank published the most recent of the rates (ISO 8601). */
  quotedAt: string;
  /** When they were downloaded (ms since the epoch). */
  fetchedAt: number;
}

const API = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/';
const DAY = 24 * 60 * 60 * 1000;
/** PTAX is published on business days only; ten days back always covers long holidays. */
const WINDOW_DAYS = 10;
const CACHE_KEY = 'salary-converter:rates';
/** Rates change a few times a day at most. */
export const MAX_AGE = 60 * 60 * 1000;

const FOREIGN = CURRENCIES.filter((currency) => currency !== 'BRL');

/** The API wants MM-DD-YYYY, in Brasília time (UTC−3). */
export function apiDate(date: Date): string {
  const brasilia = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const month = String(brasilia.getUTCMonth() + 1).padStart(2, '0');
  const day = String(brasilia.getUTCDate()).padStart(2, '0');
  return `${month}-${day}-${brasilia.getUTCFullYear()}`;
}

/** "2024-05-14 13:04:30.818", Brasília time (UTC−3, no daylight saving since 2019), to ISO 8601. */
export function parseQuoteTime(text: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)/.exec(text);
  const date = match && new Date(`${match[1]}T${match[2]}-03:00`);
  if (!date || Number.isNaN(date.getTime())) throw new Error(`Unexpected quote time: ${text}`);
  return date.toISOString();
}

export function quoteUrl(currency: Currency, now: Date): string {
  const start = apiDate(new Date(now.getTime() - WINDOW_DAYS * DAY));
  const end = apiDate(now);
  return (
    `${API}CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@moeda='${currency}'&@dataInicial='${start}'&@dataFinalCotacao='${end}'` +
    `&$top=100&$format=json&$select=cotacaoVenda,dataHoraCotacao`
  );
}

async function fetchQuote(currency: Currency, now: Date, fetcher: typeof fetch) {
  const response = await fetcher(quoteUrl(currency, now), { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`The Central Bank answered ${response.status} for ${currency}`);
  const data = (await response.json()) as { value?: { cotacaoVenda?: unknown; dataHoraCotacao?: unknown }[] };
  // Quotes come oldest first; the last one is the latest bulletin.
  const latest = data.value?.at(-1);
  if (typeof latest?.cotacaoVenda !== 'number' || !(latest.cotacaoVenda > 0) || typeof latest.dataHoraCotacao !== 'string') {
    throw new Error(`No recent ${currency} rate from the Central Bank`);
  }
  return { rate: latest.cotacaoVenda, quotedAt: parseQuoteTime(latest.dataHoraCotacao) };
}

export async function fetchRates(fetcher: typeof fetch = fetch, now = new Date()): Promise<RateSheet> {
  const quotes = await Promise.all(FOREIGN.map((currency) => fetchQuote(currency, now, fetcher)));
  const rates = { BRL: 1 } as Rates;
  FOREIGN.forEach((currency, i) => (rates[currency] = quotes[i].rate));
  const quotedAt = quotes.map((quote) => quote.quotedAt).sort().at(-1)!;
  return { rates, quotedAt, fetchedAt: now.getTime() };
}

function isRateSheet(value: unknown): value is RateSheet {
  const sheet = value as RateSheet | null;
  return (
    typeof sheet?.quotedAt === 'string' &&
    typeof sheet.fetchedAt === 'number' &&
    CURRENCIES.every((currency) => typeof sheet.rates?.[currency] === 'number' && sheet.rates[currency] > 0)
  );
}

export function loadCachedRates(): RateSheet | null {
  try {
    const sheet: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return isRateSheet(sheet) ? sheet : null;
  } catch {
    return null;
  }
}

export function saveCachedRates(sheet: RateSheet): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(sheet));
  } catch {
    // Storage unavailable: rates are fetched again next time.
  }
}
