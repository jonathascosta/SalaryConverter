class CurrencyConverter {
    constructor() {
        this.apiKey = 'fccea0316b0c44a29474b7e041a2b146';
        this.apiUrl = `https://openexchangerates.org/api/latest.json?app_id=${this.apiKey}`;
        this.rates = {};
        this.cacheDuration = 60 * 60 * 1000;
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
        const cachedRates = this.getCachedRates();
        if (cachedRates) {
            this.rates = cachedRates;
            this.initializeEventListeners();
        } else {
            await this.fetchRates();
        }
    }

    getCachedRates() {
        const cachedData = localStorage.getItem('exchangeRates');
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const now = new Date().getTime();
            if (now - parsedData.timestamp < this.cacheDuration) {
                return parsedData.rates;
            } else {
                localStorage.removeItem('exchangeRates');
            }
        }
        return null;
    }

    cacheRates(rates) {
        const data = {
            rates: rates,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('exchangeRates', JSON.stringify(data));
    }

    async fetchRates() {
        try {
            const response = await fetch(this.apiUrl);
            const data = await response.json();
            this.rates = data.rates;
            this.cacheRates(this.rates);
            this.initializeEventListeners();
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
        }
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
