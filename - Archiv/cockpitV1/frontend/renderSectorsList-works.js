import { getSectorClass, getDiffColor, formatDiff, renderRankCircle } from "../helpers/renderHelpers.js";
import { passesSignalFilter } from "../helpers/filterHelpers.js";

export function renderSectorSignalDot(sectorName) {
    const store = window.dataStore || {};
    const signals = store.sparkSignals?.sectors || {};
    const sig = signals[sectorName];

    if (!sig) return "";
    if (sig.signal === "entry") return `<span class="sig-dot entry"></span>`;
    if (sig.signal === "exit")  return `<span class="sig-dot exit"></span>`;
    return "";
}

window.renderSectorSignalDot = renderSectorSignalDot;


export function renderSectorsList(sectors, state) {
    const column = document.getElementById('sectors');
    const container = document.getElementById('sector-list-container');
  
    if (!column || !container) return;

    // ⭐ NEU: Unabhängige Sector-Filter anwenden
const filteredSectors = sectors.filter(sec =>
    passesSignalFilter(
        window.dataStore?.sparkSignals?.sectors?.[sec.sector],
        state.filterEntrySectors,
        state.filterExitSectors
    )
);


    // ⭐ Danach sortieren
    const sortedSectors = [...filteredSectors].sort((a, b) => {
        const rankA = Number(a.rsRank ?? 999);
        const rankB = Number(b.rsRank ?? 999);
        return rankA - rankB;
    });

    // ⭐ Rows rendern
    const rowsHtml = sortedSectors.map(item => {
        const isSelected = item.sector === state.sector;
        const score = (item.rsScore ?? 0).toFixed(2);

        const count = (state.stocks || []).filter(s => {
            const stockSector = s.sector || s.sector_name;
            return stockSector === item.sector;
        }).length;

        return `
            <div class="grid-row-sector stock-item ${isSelected ? 'highlight-sector' : ''}"
                 data-sector="${item.sector}">

                <div class="grid-cell ${getSectorClass(item.sector)}">
                  ${renderRankCircle(item.rsRank, window.dataStore?.sparkSignals?.sectors?.[item.sector])}
                  ${isSelected ? '▶ ' : ''}${item.sector} (${score})
                </div>

                <div class="grid-cell count-cell">[${count}]</div>

                <div class="grid-cell" style="color:${getDiffColor(item.diffW)};">
                    ${formatDiff(item.diffW)}
                </div>


                <div class="grid-cell" style="color:${getDiffColor(item.diffM)};">
                    ${formatDiff(item.diffM)}
                </div>

                <div class="grid-cell" style="color:${getDiffColor(item.diffQ)};">
                    ${formatDiff(item.diffQ)}
                </div>
            </div>
        `;
    }).join('');

    // ⭐ Header + Pillen + Tabelle
    container.innerHTML = `
        <div class="sectors-header">
            <div class="sectors-header-title">
                Sectors 
                <span class="pill pill-count">${sortedSectors.length}</span>

                <span class="pill pill-entry ${state.filterEntrySectors ? 'active' : ''}" 
                      data-type="entry-sectors">Entry</span>

                <span class="pill pill-exit ${state.filterExitSectors ? 'active' : ''}" 
                      data-type="exit-sectors">Exit</span>
            </div>

            <div class="sectors-header-diffs">
                <div>∑ Stocks</div>
                <div>W</div>
                <div>M</div>
                <div>Q</div>
            </div>
        </div>

        <div class="grid-table">
            ${rowsHtml}
        </div>
    `;
}
