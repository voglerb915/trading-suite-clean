// focus-panel/filters/filterActions.js

import { filterState } from "./filterState.js";

export function setSector(sector) {
    filterState.sector = sector;
    filterState.industry = null; // Industry reset bei Sector-Wechsel
}

export function setIndustry(industry) {
    filterState.industry = industry;
}
