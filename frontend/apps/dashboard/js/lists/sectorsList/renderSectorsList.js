import { getFilteredAndSortedSectors } from "./sectorsFilterLogic.js";
import { renderSectorHeader } from "./sub-renderers/renderSectorPills.js";
import { renderSectorItem } from "./sub-renderers/renderSectorItem.js";

export function renderSectorsList(sectors, state, onStateChange) {
    const column = document.getElementById('sectors');
    const container = document.getElementById('sector-list-container');
 
    if (!column || !container) return;

    const sparkSectors = window.dataStore?.sparkSignals?.sectors || {};

    const sortedSectors = getFilteredAndSortedSectors(sectors, state, sparkSectors);

    const rowsHtml = sortedSectors.map(item => renderSectorItem(item, state, sparkSectors)).join('');
    const headerHtml = renderSectorHeader(sortedSectors.length, state);

    container.innerHTML = `
        ${headerHtml}
        <div class="grid-table">
            ${rowsHtml}
        </div>
    `;


}