class PeriodConverter {
    constructor(equivalences) {
        this.defaultEquivalences = {
            'hour': '1h',
            'day': '8h',
            'week': '5d',
            'month': '20d',
            'year': '12m'
        };
        this.errors = {};
        this.equivalences = this.validateEquivalences(equivalences);
        this.unitConversions = {
            'hour': 1
        };
        this.resolving = {};
    }

    validateEquivalences(equivalences) {
        const validatedEquivalences = { ...this.defaultEquivalences };
        for (const period in equivalences) {
            const value = equivalences[period];
            if (this.isValidPeriodDescription(value)) {
                validatedEquivalences[period] = value;
            } else {
                this.errors[period] = `Invalid value for ${period}: ${value}`;
            }
        }
        return validatedEquivalences;
    }

    isValidPeriodDescription(description) {
        const match = description.match(/^\d+(\.\d+)?[hdwm]$/);
        return match !== null;
    }

    convertToHours() {
        const periodsInHours = {};

        for (const period in this.equivalences) {
            this.resolvePeriod(period);
        }

        for (const period in this.equivalences) {
            periodsInHours[period] = this.unitConversions[period];
        }

        return periodsInHours;
    }

    resolvePeriod(period) {
        if (this.unitConversions[period]) {
            return this.unitConversions[period];
        }

        if (this.resolving[period]) {
            throw new Error(`Circular dependency detected while resolving period: ${period}`);
        }
        this.resolving[period] = true;

        const description = this.equivalences[period];
        const [value, unit] = this.parsePeriodDescription(description);

        if (!this.unitConversions[unit]) {
            this.resolvePeriod(unit);
        }
        const unitValue = this.unitConversions[unit];
        this.unitConversions[period] = parseFloat(value) * unitValue;

        delete this.resolving[period];
        return this.unitConversions[period];
    }

    parsePeriodDescription(description) {
        const match = description.match(/(\d+(?:\.\d+)?)([a-zA-Z]+)/);
        if (!match) {
            throw new Error(`Invalid period description: ${description}`);
        }
        const value = match[1];
        const unit = this.convertUnit(match[2]);
        return [value, unit];
    }

    convertUnit(abbreviation) {
        const unitMap = {
            'h': 'hour',
            'd': 'day',
            'w': 'week',
            'm': 'month',
            'y': 'year'
        };
        return unitMap[abbreviation] || abbreviation;
    }
}