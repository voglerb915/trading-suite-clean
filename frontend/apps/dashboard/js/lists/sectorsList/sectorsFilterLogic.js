import { passesSignalFilter } from "../../helpers/filterHelpers.js";

export function getFilteredAndSortedSectors(sectors, state, sparkSectors) {
    const filteredSectors = sectors.filter(sec =>
        passesSignalFilter(
            sparkSectors[sec.sector],
            state.filterBuySectors,
            state.filterSellSectors
        )
    );

    return [...filteredSectors].sort((a, b) => {
        const rankA = Number(a.rsRank ?? 999);
        const rankB = Number(b.rsRank ?? 999);
        return rankA - rankB;
    });
}