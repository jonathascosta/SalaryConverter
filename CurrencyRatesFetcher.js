export class CurrencyRatesFetcher {
    constructor() {
        this.apiBaseUrl = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo';
    }

    formatDate(date) {
        const d = new Date(date);
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${month}-${day}-${year}`;
    }

    async getExchangeRate(moeda, startDate, endDate) {
        const formattedStartDate = this.formatDate(startDate);
        const formattedEndDate = this.formatDate(endDate);
        const url = `${this.apiBaseUrl}(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@moeda='${moeda}'&@dataInicial='${formattedStartDate}'&@dataFinalCotacao='${formattedEndDate}'&$top=100&$skip=0&$format=json&$select=paridadeCompra,paridadeVenda,cotacaoCompra,cotacaoVenda,dataHoraCotacao`;
        const response = await fetch(url);
        const data = await response.json();
        return data.value[data.value.length - 1]; // Assume usar a última cotação
    }

    async getLatestRates() {
        const endDate = new Date();
        const startDate = new Date(new Date().setDate(new Date().getDate() - 7));
        const rates = {};
        rates.BRL = { paridadeCompra: 1.0, paridadeVenda: 1.0, cotacaoCompra: 1.0, cotacaoVenda: 1.0 };
        rates.EUR = await this.getExchangeRate('EUR', startDate, endDate);
        rates.GBP = await this.getExchangeRate('GBP', startDate, endDate);
        rates.USD = await this.getExchangeRate('USD', startDate, endDate);

        return rates;
    }
}
