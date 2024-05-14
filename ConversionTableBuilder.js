export class ConversionTableBuilder {
    constructor(containerId, currencies, periods) {
        this.containerId = containerId;
        this.currencies = currencies;
        this.periods = periods;
        this.createTable();
    }

    createTable() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Container with id ${this.containerId} not found`);
            return;
        }

        const table = document.createElement('table');
        table.id = 'conversionTable';

        const thead = this.createTableHead();
        const tbody = this.createTableBody();

        table.appendChild(thead);
        table.appendChild(tbody);
        container.appendChild(table);
    }

    createTableHead() {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        
        const thPeriod = document.createElement('th');
        thPeriod.textContent = 'Period';
        tr.appendChild(thPeriod);
        
        this.currencies.forEach(currency => {
            const th = document.createElement('th');
            th.textContent = currency;
            tr.appendChild(th);
        });

        thead.appendChild(tr);
        return thead;
    }

    createTableBody() {
        const tbody = document.createElement('tbody');

        this.periods.forEach(period => {
            const tr = document.createElement('tr');

            const tdPeriod = document.createElement('td');
            tdPeriod.textContent = period.charAt(0).toUpperCase() + period.slice(1);
            tr.appendChild(tdPeriod);

            this.currencies.forEach(currency => {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'text';
                input.dataset.period = period;
                input.dataset.currency = currency;
                td.appendChild(input);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        return tbody;
    }
}
