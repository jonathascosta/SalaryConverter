import { CurrencyRatesFetcher } from './CurrencyRatesFetcher.js';
import { ConversionTableBuilder } from './ConversionTableBuilder.js';

class CurrencyConverter {
    constructor() {
        this.fetcher = new CurrencyRatesFetcher();
        this.currencies = ['BRL', 'USD', 'EUR', 'GBP'];
        this.periods = {
            'hour': 1,
            'day': 8,
            'week': 8 * 5,
            'month': 8 * 20,
            'year': 8 * 20 * 12
        };
        this.rates = {};
        this.currencyLocales = {
            'BRL': 'pt-BR',
            'USD': 'en-US',
            'EUR': 'de-DE',
            'GBP': 'en-GB'
        };
        this.initialize();
    }

    async initialize() {
        new ConversionTableBuilder('conversionTableContainer', this.currencies, Object.keys(this.periods));
        this.rates = await this.fetcher.getLatestRates();
        this.initializeEventListeners();
        this.displayConversionInfo();
    }

    initializeEventListeners() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('focus', (e) => this.handleFocus(e.target));
            input.addEventListener('blur', (e) => this.handleInput(e.target));
        });
    }

    handleFocus(input) {
        let value = input.value.replace(/[^\d]/g, '');
        if (value) {
            const floatValue = parseFloat(value) / 100;
            if (!isNaN(floatValue)) {
                input.value = floatValue.toFixed(2);
            }
        }
    }

    handleInput(input) {
        const period = input.dataset.period;
        const currency = input.dataset.currency;
        const value = parseFloat(input.value.replace(/[^\d.-]/g, ''));
        if (isNaN(value)) return;

        this.calculateColumn(currency, period, value);
        this.calculateOtherColumns(currency);
        this.formatInputs();
        this.displayConversionInfo();
    }

    calculateColumn(currency, period, value) {
        const conversionFactor = value / this.periods[period];
        for (let key in this.periods) {
            const input = document.querySelector(`input[data-period="${key}"][data-currency="${currency}"]`);
            if (input) {
                input.value = (conversionFactor * this.periods[key]).toFixed(2);
            }
        }
    }

    calculateOtherColumns(baseCurrency) {
        const baseValues = {};
        for (let key in this.periods) {
            const input = document.querySelector(`input[data-period="${key}"][data-currency="${baseCurrency}"]`);
            if (input && !isNaN(parseFloat(input.value))) {
                baseValues[key] = parseFloat(input.value);
            } else {
                return;
            }
        }

        const baseToBRL = this.rates[baseCurrency].cotacaoVenda;

        for (let currency in this.rates) {
            if (currency !== baseCurrency) {
                const targetRate = this.rates[currency].cotacaoVenda;

                for (let key in this.periods) {
                    const input = document.querySelector(`input[data-period="${key}"][data-currency="${currency}"]`);
                    if (input) {
                        const valueInBRL = baseValues[key] * baseToBRL;
                        input.value = (valueInBRL / targetRate).toFixed(2);
                    }
                }
            }
        }
    }

    formatInputs() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            const value = parseFloat(input.value);
            const currency = input.dataset.currency;
            if (!isNaN(value)) {
                const locale = this.currencyLocales[currency] || 'en-US';
                input.value = new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(value);
            }
        });
    }

    displayConversionInfo() {
        const conversionInfo = document.getElementById('conversionInfo');
        conversionInfo.innerHTML = '';
        const infoList = [
            `1 EUR = ${this.rates.EUR.cotacaoVenda.toFixed(2)} BRL`,
            `1 GBP = ${this.rates.GBP.cotacaoVenda.toFixed(2)} BRL`,
            `1 USD = ${this.rates.USD.cotacaoVenda.toFixed(2)} BRL`,
            `Exchange rates updated at ${this.rates.USD.dataHoraCotacao} BRT`
        ];
        infoList.forEach(info => {
            const li = document.createElement('li');
            li.textContent = info;
            conversionInfo.appendChild(li);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
});
