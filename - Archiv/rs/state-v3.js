// ======================================================
// CORE STATE - Zentraler Dashboard-Zustand
// ======================================================

export const dashboardState = {
    stocks: [],
    stocksOriginal: [],

    sectors: [],
    industries: [],
    etfs: [],

    strategy: "none",
    strategyItems: {},

    indexFilter: "all",
    search: "",
    sector: null,
    industry: null,
    ticker: null,

    daysInTrend: null,

    filterBuyStocks: false,
    filterSellStocks: false,
    filterBuyIndustries: false,
    filterSellIndustries: false,
    filterBuySectors: false,
    filterSellSectors: false,

    phaseLong: "all",
    phaseExit: "all",
    
    activeTypes: {
        long: true,
        exit: true
    },

    filterBuySignals: false,
    filterSellSignals: false,

    midSignals: { stocks: {} },
    sparkSignals: { stocks: {}, sectors: {}, industries: {} },

    industryMap: new Map(),
    totalInd: 0,

    referenceStock: null,

    // ⭐ Zentrale Reset-Funktion
    reset() {
        this.sector = null;
        this.industry = null;
        this.ticker = null;
        this.search = "";
        this.indexFilter = "all";
        this.daysInTrend = null;
        this.strategy = "none";
        this.filterBuyStocks = false;
        this.filterSellStocks = false;
        this.filterBuyIndustries = false;
        this.filterSellIndustries = false;
        this.filterBuySectors = false;
        this.filterSellSectors = false;
        this.phaseLong = "all";
        this.phaseExit = "all";
        
        if (this.stocksOriginal && this.stocksOriginal.length > 0) {
            this.stocks = [...this.stocksOriginal];
        }
    }
};