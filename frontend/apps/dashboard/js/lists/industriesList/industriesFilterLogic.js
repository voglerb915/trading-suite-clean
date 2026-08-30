import { passesSignalFilter } from "../../helpers/filterHelpers.js";

export function getFilteredAndSortedIndustries(industries, state) {
    const filteredIndustries = industries.filter(ind =>
        passesSignalFilter(
            window.dataStore?.sparkSignals?.industries?.[ind.industry],
            state.filterBuyIndustries,
            state.filterSellIndustries
        )
    );

    return [...filteredIndustries].sort((a, b) => {
        return Number(a.rsRank ?? 999) - Number(b.rsRank ?? 999);
    });
}