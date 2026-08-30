// =========================================================
//  SELECTION HANDLERS (Sectors, Industries, Stocks)
//  zentrale Dashboard-Logik, kein DOM, kein Rendering
// =========================================================

export function handleSectorSelection(state, sectorName) {

    // Toggle Sector
    if (state.sector === sectorName) {
        return {
            ...state,          // ⭐ GANZ WICHTIG
            sector: null,
            industry: null,
            ticker: null
        };
    }

    // Sector select
    return {
        ...state,              // ⭐ GANZ WICHTIG
        sector: sectorName,
        industry: null,
        ticker: null
    };
}


export function handleIndustrySelection(state, industryName, industrySector) {

    // Toggle Industry
    if (state.industry === industryName) {
        return {
            ...state,          // ⭐ GANZ WICHTIG
            industry: null,
            ticker: null
        };
    }

    // Industry select
    return {
        ...state,              // ⭐ GANZ WICHTIG
        sector: state.sector ?? industrySector,
        industry: industryName,
        ticker: null
    };
}


export function handleStockSelection(state, stock) {
    // stock = { ticker, industry, sector }

    if (state.ticker === stock.ticker) {
        return state; // unverändert
    }

    return {
        ...state,              // ⭐ GANZ WICHTIG
        sector: stock.sector,
        industry: stock.industry,
        ticker: stock.ticker
    };
}
