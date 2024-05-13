class CurrencyConverter {
    constructor() {
        this.rates = {
            'USD': 1,
            'BRL': 5.25,
            'EUR': 0.85,
            'GBP': 0.75
        };
        this.periods = {
            'hour': 1,
            'day': 8,
            'week': 8 * 5,
            'month': 8 * 20,
            'year': 8 * 20 * 12
        };
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => this.handleInput(e));
        });
    }

    handleInput(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        if (isNaN(value)) return;

        const period = input.dataset.period;
        const currency = input.dataset.currency;
        
        this.calculateColumn(currency, period, value);
        this.calculateOtherColumns(currency);
    }

    calculateColumn(currency, period, value) {
        const conversionFactor = value / this.periods[period];
        for (let key in this.periods) {
            const input = document.querySelector(`input[data-period="${key}"][data-currency="${currency}"]`);
            input.value = (conversionFactor * this.periods[key]).toFixed(2);
        }
    }

    calculateOtherColumns(baseCurrency) {
        const baseValues = {};
        for (let key in this.periods) {
            const input = document.querySelector(`input[data-period="${key}"][data-currency="${baseCurrency}"]`);
            baseValues[key] = parseFloat(input.value);
        }

        for (let currency in this.rates) {
            if (currency !== baseCurrency) {
                for (let key in this.periods) {
                    const input = document.querySelector(`input[data-period="${key}"][data-currency="${currency}"]`);
                    input.value = (baseValues[key] * (this.rates[currency] / this.rates[baseCurrency])).toFixed(2);
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
});
