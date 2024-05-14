import { CurrencyRatesFetcher } from './CurrencyRatesFetcher.js';

class CurrencyConverter {
    constructor() {
        this.fetcher = new CurrencyRatesFetcher();
        this.rates = {};
        this.periods = {
            'hour': 1,
            'day': 8,
            'week': 8 * 5,
            'month': 8 * 20,
            'year': 8 * 20 * 12
        };
        this.currencyLocales = {
            'BRL': 'pt-BR',
            'USD': 'en-US',
            'EUR': 'de-DE',
            'GBP': 'en-GB'
        };
        this.initialize();
    }

    async initialize() {
        this.rates = await this.fetcher.getLatestRates();
        this.initializeEventListeners();
        this.displayConversionInfo();
    }

    initializeEventListeners() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', (e) => this.handleInput(e.target));
        });
    }

    handleInput(input) {
        const period = input.dataset.period;
        const currency = input.dataset.currency;
        const rate = this.rates[currency];
        const value = parseFloat(input.value.replace(/[^0-9.-]+/g, ""));
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

        for (let currency in this.rates) {
            if (currency !== baseCurrency) {
                for (let key in this.periods) {
                    const input = document.querySelector(`input[data-period="${key}"][data-currency="${currency}"]`);
                    if (input) {
                        input.value = (baseValues[key] * (this.rates[currency].cotacaoVenda / this.rates[baseCurrency].cotacaoVenda)).toFixed(2);
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
        let infoHTML = '<h3>Conversion Info</h3>';
        infoHTML += '<ul>';
        infoHTML += `<li>1 EUR = ${this.rates.EUR.cotacaoVenda.toFixed(2)} BRL</li>`;
        infoHTML += `<li>1 GBP = ${this.rates.GBP.cotacaoVenda.toFixed(2)} BRL</li>`;
        infoHTML += `<li>1 USD = ${this.rates.BRL.cotacaoVenda.toFixed(2)} BRL</li>`;
        infoHTML += `<li>Exchange rates updated at ${this.rates.BRL.dataHoraCotacao}</li>`;
        infoHTML += '</ul>';
        conversionInfo.innerHTML = infoHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
});