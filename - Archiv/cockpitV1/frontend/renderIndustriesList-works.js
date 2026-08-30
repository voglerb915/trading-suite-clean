import { getSectorClass, getDiffColor, formatDiff, renderRankCircle } from "../helpers/renderHelpers.js";
import { passesSignalFilter } from "../helpers/filterHelpers.js";

export function renderIndustrySignalDot(industryName) {
    const store = window.dataStore || {};
    const signals = store.sparkSignals?.industries || {};
    const sig = signals[industryName];

    if (!sig) return "";
    if (sig.signal === "entry") return `<span class="sig-dot entry"></span>`;
    if (sig.signal === "exit")  return `<span class="sig-dot exit"></span>`;
    return "";
}

window.renderIndustrySignalDot = renderIndustrySignalDot;

export function renderIndustriesList(industries, state) {
    const column = document.getElementById("industries");
    const container = document.getElementById("industry-list-container");

    if (!column || !container) return;

    // ⭐ Unabhängige Industries-Filter anwenden
const filteredIndustries = industries.filter(ind =>
    passesSignalFilter(
        window.dataStore?.sparkSignals?.industries?.[ind.industry],
        state.filterEntryIndustries,
        state.filterExitIndustries
    )
);


    // ⭐ Danach sortieren
    const sortedIndustries = [...filteredIndustries].sort((a, b) => {
        const rankA = Number(a.rsRank ?? 999);
        const rankB = Number(b.rsRank ?? 999);
        return rankA - rankB;
    });

    // ⭐ Rows rendern
    const rowsHtml = sortedIndustries.map(item => {
        const isSelected = item.industry === state.industry;
        const score = (item.rsScore ?? 0).toFixed(2);

        const count = (state.stocks || []).filter(s => {
            const stockIndustry = s.industry || s.industry_name;
            return stockIndustry === item.industry;
        }).length;

        return `
            <div class="grid-row-sector stock-item ${isSelected ? "highlight-sector" : ""}"
                 data-industry="${item.industry}">

                <div class="grid-cell ${getSectorClass(item.sector)}">
                    ${renderRankCircle(item.rsRank, window.dataStore?.sparkSignals?.industries?.[item.industry])}
                    ${isSelected ? '▶ ' : ''}${item.industry} (${score})
                </div>


                <div class="grid-cell count-cell">[${count}]</div>
                <div class="grid-cell" style="color:${getDiffColor(item.diffD)};">${formatDiff(item.diffD)}</div>
                <div class="grid-cell" style="color:${getDiffColor(item.diffW)};">${formatDiff(item.diffW)}</div>
                <div class="grid-cell" style="color:${getDiffColor(item.diffM)};">${formatDiff(item.diffM)}</div>
            </div>
        `;
    }).join("");

    // ⭐ Header + Pillen + Tabelle
    container.innerHTML = `
        <div class="sectors-header">
            <div class="sectors-header-title">
                Industries 
                <span class="pill pill-count">${sortedIndustries.length}</span>

                <span class="pill pill-entry ${state.filterEntryIndustries ? 'active' : ''}" 
                      data-type="entry-industries">Entry</span>

                <span class="pill pill-exit ${state.filterExitIndustries ? 'active' : ''}" 
                      data-type="exit-industries">Exit</span>
            </div>

            <div class="sectors-header-diffs">
                <div>∑ Stocks</div>
                <div>D</div>
                <div>W</div>
                <div>M</div>
            </div>
        </div>

        <div class="grid-table">
            ${rowsHtml}
        </div>
    `;
}
