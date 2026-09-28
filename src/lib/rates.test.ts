// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { apiDate, fetchRates, loadCachedRates, parseQuoteTime, quoteUrl, saveCachedRates } from './rates';

const RATES: Record<string, number> = { USD: 5.14, EUR: 5.56, GBP: 6.47 };

/** A stand-in for the Central Bank API, with two bulletins per currency. */
function fakeFetch(overrides: { status?: number; empty?: string } = {}): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = decodeURIComponent(String(input));
    const currency = /@moeda='([A-Z]{3})'/.exec(url)![1];
    if (overrides.status) return new Response('error', { status: overrides.status });
    const value =
      overrides.empty === currency
        ? []
        : [
            { cotacaoVenda: RATES[currency] - 0.1, dataHoraCotacao: '2024-05-13 13:05:12.345' },
            { cotacaoVenda: RATES[currency], dataHoraCotacao: `2024-05-14 13:0${currency === 'GBP' ? 5 : 4}:30.818` },
          ];
    return Response.json({ value });
  }) as typeof fetch;
}

describe('dates', () => {
  it('asks for dates in Brasília time', () => {
    expect(apiDate(new Date('2024-05-14T02:00:00Z'))).toBe('05-13-2024');
    expect(apiDate(new Date('2024-05-14T15:00:00Z'))).toBe('05-14-2024');
  });

  it('reads quote times as Brasília time', () => {
    expect(parseQuoteTime('2024-05-14 13:04:30.818')).toBe('2024-05-14T16:04:30.818Z');
    expect(parseQuoteTime('2024-05-14 13:04')).toBe('2024-05-14T16:04:00.000Z');
    expect(() => parseQuoteTime('yesterday')).toThrow();
  });

  it('builds the PTAX query for the last ten days', () => {
    const url = quoteUrl('EUR', new Date('2024-05-14T15:00:00Z'));
    expect(url).toContain("@moeda='EUR'");
    expect(url).toContain("@dataInicial='05-04-2024'");
    expect(url).toContain("@dataFinalCotacao='05-14-2024'");
  });
});

describe('fetchRates', () => {
  it('takes the latest selling rate of each currency', async () => {
    const sheet = await fetchRates(fakeFetch(), new Date('2024-05-14T20:00:00Z'));
    expect(sheet.rates).toEqual({ BRL: 1, ...RATES });
    expect(sheet.quotedAt).toBe('2024-05-14T16:05:30.818Z');
    expect(sheet.fetchedAt).toBe(new Date('2024-05-14T20:00:00Z').getTime());
  });

  it('fails when the Central Bank does not answer properly', async () => {
    await expect(fetchRates(fakeFetch({ status: 503 }))).rejects.toThrow(/503/);
    await expect(fetchRates(fakeFetch({ empty: 'GBP' }))).rejects.toThrow(/GBP/);
  });
});

describe('cache', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the last rates', async () => {
    expect(loadCachedRates()).toBeNull();
    const sheet = await fetchRates(fakeFetch());
    saveCachedRates(sheet);
    expect(loadCachedRates()).toEqual(sheet);
  });

  it('ignores anything else', () => {
    localStorage.setItem('salary-converter:rates', '{"rates":{"USD":5}}');
    expect(loadCachedRates()).toBeNull();
    localStorage.setItem('salary-converter:rates', 'not json');
    expect(loadCachedRates()).toBeNull();
  });
});
