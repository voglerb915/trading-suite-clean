import { getFilteredAndSortedIndustries } from "./industriesFilterLogic.js";
import { renderIndustryHeader } from "./sub-renderers/renderIndustryPills.js";
import { renderIndustryItem } from "./sub-renderers/renderIndustryItem.js";

export function renderIndustriesList(industries, state) {
    const container = document.getElementById("industry-list-container");
    if (!container) return;

    const sortedIndustries = getFilteredAndSortedIndustries(industries, state);

    // Aktiven Sektor aus dem State ermitteln (für den Score-Vergleich)
    const activeSector = state.sector 
        ? (state.sectors || []).find(sec => sec.sector === state.sector) 
        : null;

    const rowsHtml = sortedIndustries.map(item => renderIndustryItem(item, state, activeSector)).join("");
    const headerHtml = renderIndustryHeader(sortedIndustries.length, state);

    container.innerHTML = `
        ${headerHtml}
        <div class="grid-table">${rowsHtml}</div>
    `;
}