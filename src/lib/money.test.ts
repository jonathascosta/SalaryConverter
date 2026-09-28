import { describe, expect, it } from 'vitest';
import { decimalSeparator, formatMoney, formatPlain, parseAmount } from './money';

describe('parseAmount', () => {
  it.each([
    ['3000', 'en-US', 3000],
    ['3,000.50', 'en-US', 3000.5],
    ['3.000,50', 'en-US', 3000.5],
    ['3.000,50', 'pt-BR', 3000.5],
    ['R$ 3.000', 'pt-BR', 3000],
    ['$1,234', 'en-US', 1234],
    ['1,234', 'pt-BR', 1.234],
    ['3.000', 'en-US', 3],
    ['25,5', 'en-US', 25.5],
    ['25.50', 'pt-PT', 25.5],
    ['1.000.000', 'en-US', 1_000_000],
    ['1,000,000.99', 'pt-BR', 1_000_000.99],
    ['€ 2.698,00', 'de-DE', 2698],
    ['15\u202f000,00\u00a0€', 'pt-PT', 15_000],
    ["1'250.75 CHF", 'de-CH', 1250.75],
    ['12.', 'en-US', 12],
    [',5', 'en-US', 0.5],
    ['0', 'en-US', 0],
  ])('reads %j (%s) as %d', (text, locale, expected) => {
    expect(parseAmount(text, locale)).toBeCloseTo(expected, 10);
  });

  it.each(['', ' ', '.', 'abc', '12abc34', '-5', '1.2.3,4,5', '1,2,3.4.5'])('rejects %j', (text) => {
    expect(parseAmount(text, 'en-US')).toBeNull();
  });
});

describe('formatting', () => {
  it('knows the decimal separator of a locale', () => {
    expect(decimalSeparator('en-US')).toBe('.');
    expect(decimalSeparator('pt-BR')).toBe(',');
  });

  it('formats money in the reader’s locale', () => {
    expect(formatMoney(15_000, 'BRL', 'en-US')).toBe('R$15,000.00');
    expect(formatMoney(2918.29, 'USD', 'en-US')).toBe('$2,918.29');
    expect(formatMoney(15_000, 'EUR', 'pt-PT').replace(/\s/g, ' ')).toBe('15 000,00 €');
  });

  it('formats plain numbers for editing, and parses them back', () => {
    expect(formatPlain(2918.29, 'pt-BR')).toBe('2918,29');
    expect(formatPlain(15_000, 'en-US')).toBe('15000');
    for (const locale of ['en-US', 'pt-BR', 'de-DE', 'pt-PT', 'fr-FR']) {
      for (const value of [0.5, 18.75, 1234.56, 15_000, 1_000_000.1]) {
        expect(parseAmount(formatPlain(value, locale), locale)).toBeCloseTo(value, 2);
        expect(parseAmount(formatMoney(value, 'EUR', locale), locale)).toBeCloseTo(value, 2);
      }
    }
  });
});
