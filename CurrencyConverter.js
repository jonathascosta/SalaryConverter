import { CurrencyRatesFetcher } from './CurrencyRatesFetcher.js';
import { ConversionTableBuilder } from './ConversionTableBuilder.js';
import { PeriodConverter } from './PeriodConverter.js';

class CurrencyConverter {
    constructor() {
        this.equivalences = this.loadEquivalences();
        this.converter = new PeriodConverter(this.equivalences);
        this.periods = this.converter.convertToHours();
        
        this.fetcher = new CurrencyRatesFetcher();
        this.currencies = ['BRL', 'USD', 'EUR', 'GBP'];
        this.rates = {};
        this.currencyLocales = {
            'BRL': 'pt-BR',
            'USD': 'en-US',
            'EUR': 'de-DE',
            'GBP': 'en-GB'
        };
        
        this.initialize();
    }

    loadEquivalences() {
        const defaultEquivalences = {
            'day': '8h',
            'week': '5d',
            'month': '20d',
            'year': '12m'
        };
        const savedEquivalences = JSON.parse(localStorage.getItem('equivalences'));
        return savedEquivalences ? { ...defaultEquivalences, ...savedEquivalences } : defaultEquivalences;
    }

    saveEquivalences() {
        localStorage.setItem('equivalences', JSON.stringify(this.equivalences));
    }

    async initialize() {
        new ConversionTableBuilder('conversionTableContainer', this.currencies, Object.keys(this.periods));
        this.rates = await this.fetcher.getLatestRates();
        this.initializeEventListeners();
        this.displayConversionInfo();
    }

    initializeEventListeners() {
        const inputs = document.querySelectorAll('input.equivalence');
        inputs.forEach(input => {
            input.value = this.equivalences[input.dataset.period] || '';
            input.addEventListener('change', (e) => this.handleEquivalenceChange(e.target));
        });

        const currencyInputs = document.querySelectorAll('td input');
        currencyInputs.forEach(input => {
            input.addEventListener('focus', (e) => this.handleFocus(e.target));
            input.addEventListener('blur', (e) => this.handleBlur(e.target));
        });
    }

    handleEquivalenceChange(input) {
        const period = input.dataset.period;
        const value = input.value;
        if (this.isValidPeriodDescription(value)) {
            this.equivalences[period] = value;
            this.converter = new PeriodConverter(this.equivalences);
            this.periods = this.converter.convertToHours();
            this.saveEquivalences();
            this.refresh();
        } else {
            alert(`Invalid value for ${period}: ${value}`);
            input.value = this.equivalences[period];
        }
    }

    isValidPeriodDescription(description) {
        const match = description.match(/^\d+(\.\d+)?[hdwm]$/);
        return match !== null;
    }

    refresh() {
        let input = document.querySelector("#conversionTable > tbody > tr:nth-child(1) > td:nth-child(2) > input[type=text]");
        this.handleFocus(input);
        this.handleBlur(input);
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

    handleBlur(input) {
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
        const inputs = document.querySelectorAll('td input');
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
