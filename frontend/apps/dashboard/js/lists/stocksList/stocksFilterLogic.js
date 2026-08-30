import { passesSignalFilter } from "../../helpers/filterHelpersStocks.js";

export function filterAndSortStocks(stocks, state) {
    if (!stocks) return [];

    let filtered = [...stocks];

    // 1. Sector
    if (state.sector && state.sector !== "all") {
        filtered = filtered.filter(s => s.sector === state.sector);
    }

    // 2. Industry
    if (state.industry && state.industry !== "all") {
        filtered = filtered.filter(s => s.industry === state.industry);
    }

    // 3. Index
    if (state.indexFilter && state.indexFilter !== "all") {
        filtered = filtered.filter(s =>
            Array.isArray(s.index) &&
            s.index.includes(state.indexFilter)
        );
    }

    // 4. Signal-Filter
    filtered = filtered.filter(s =>
        passesSignalFilter(
            window.dataStore?.sparkSignals?.stocks?.[s.ticker],
            state.filterBuyStocks,
            state.filterSellStocks
        )
    );

    // 5. Strategy Data Merging & Sortierung
    const sortedStocks = filtered.sort((a, b) => {
        if (state.strategy && state.strategy !== "none") {
            const valA = a.strategyValue ?? a.value ?? 0;
            const valB = b.strategyValue ?? b.value ?? 0;
            return valB - valA; 
        }
        const rankA = a.globalRank ?? a.rsRank ?? a.rank ?? Infinity;
        const rankB = b.globalRank ?? b.rsRank ?? b.rank ?? Infinity;
        return rankA - rankB;
    });

    // Strategy-Items pro Item mergen
    return sortedStocks.map(item => {
        let mergedItem = item;
        if (state.strategy === "stage3topping") {
            const stratArr = state.strategyItems?.stage3topping || [];
            const stratData = stratArr.find(s => s.ticker === item.ticker);
            if (stratData) mergedItem = { ...item, ...stratData };
        } else if (state.strategy === "insideday52w") {
            const stratArr = state.strategyItems?.insideday52w || [];
            const stratData = stratArr.find(s => s.ticker === item.ticker);
            if (stratData) mergedItem = { ...item, ...stratData };
        }
        return mergedItem;
    });
}