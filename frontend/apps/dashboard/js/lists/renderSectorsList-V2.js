import { getSectorClass, getDiffColor, formatDiff, renderRankCircle } from "../helpers/renderHelpers.js";
import { passesSignalFilter } from "../helpers/filterHelpers.js";

/**
 * Universelle Normalisierung für alte + neue SparkSignals-Struktur
 */
function normalizeSectorSignal(sig) {
    if (!sig) return null;

    // Neue Struktur: { signal: "entry" | "exit" }
    if (typeof sig.signal === "string") {
        return { signal: sig.signal };
    }

    // Alte Struktur: { entry: 3, exit: 1 }
    if (typeof sig.entry === "number" || typeof sig.exit === "number") {
        if (sig.entry > 0) return { signal: "entry" };
        if (sig.exit  > 0) return { signal: "exit" };
    }

    // Alternative alte Struktur: { long: 3, short: 1 }
    if (typeof sig.long === "number" || typeof sig.short === "number") {
        if (sig.long  > 0) return { signal: "entry" };
        if (sig.short > 0) return { signal: "exit" };
    }

    // Liste von Signalen: { signals: ["entry", "exit"] }
    if (Array.isArray(sig.signals)) {
        if (sig.signals.includes("entry")) return { signal: "entry" };
        if (sig.signals.includes("exit"))  return { signal: "exit" };
    }

    return null;
}

export function renderSectorsList(sectors, state) {
    const column = document.getElementById('sectors');
    const container = document.getElementById('sector-list-container');
  
    if (!column || !container) return;

    const sparkSectors = window.dataStore?.sparkSignals?.sectors || {};

    // ⭐ Filter anwenden (Entry/Exit)
    const filteredSectors = sectors.filter(sec =>
        passesSignalFilter(
            sparkSectors[sec.sector],
            state.filterBuySectors,
            state.filterBuySectors
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

        // ⭐ SparkSignal normalisieren (alt + neu)
        const normalizedSignal = normalizeSectorSignal(sparkSectors[item.sector]);

        return `
            <div class="grid-row-sector stock-item ${isSelected ? 'highlight-sector' : ''}"
                 data-sector="${item.sector}">

                <div class="grid-cell ${getSectorClass(item.sector)}">
                  ${renderRankCircle(item.rsRank, normalizedSignal)}
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

                <span class="pill pill-buy ${state.filterBuySectors ? 'active' : ''}" 
                      data-type="entry-sectors">Buy</span>

                <span class="pill pill-sell ${state.filterSellSectors ? 'active' : ''}" 
                      data-type="exit-sectors">Sell</span>
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
