class CurrencyConverter {
    constructor() {
        this.rates = {
            "USD": 1.0,
            "BRL": 5.16,
            "EUR": 0.93,
            "GBP": 0.80
        };
        this.cacheDuration = 60 * 60 * 1000; // 1 hora em milissegundos
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
            'EUR': 'de-DE',  // Alemanha
            'GBP': 'en-GB'
        };
        this.initialize();
    }

    initialize() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', (e) => this.handleInput(e));
        });
    }

    handleInput(event) {
        const input = event.target;
        const value = parseFloat(input.value.replace(/[^0-9.-]+/g, ""));
        if (isNaN(value)) return;

        const period = input.dataset.period;
        const currency = input.dataset.currency;

        this.calculateColumn(currency, period, value);
        this.calculateOtherColumns(currency);
        this.formatInputs();
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
                        input.value = (baseValues[key] * (this.rates[currency] / this.rates[baseCurrency])).toFixed(2);
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
}

document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
});
