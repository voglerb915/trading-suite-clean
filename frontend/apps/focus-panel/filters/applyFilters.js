// focus-panel/filters/applyFilters.js

import { filterState } from "./filterState.js";

export function applyFilters(data) {
    if (!Array.isArray(data)) return [];

    const { sector, industry } = filterState;

    let result = data;

    if (sector) {
        result = result.filter(item => item.sector === sector);
    }

    if (industry) {
        result = result.filter(item => item.industry === industry);
    }

    return result;
}
