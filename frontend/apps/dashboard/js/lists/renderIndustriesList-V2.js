import { getSectorClass, getDiffColor, formatDiff, renderRankCircle } from "../helpers/renderHelpers.js";
import { passesSignalFilter } from "../helpers/filterHelpers.js";

/**
 * Universelle Normalisierung für alte + neue SparkSignals-Struktur
 * → sorgt dafür, dass renderRankCircle IMMER ein gültiges Signal bekommt
 */
function normalizeIndustrySignal(sig) {
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

export function renderIndustriesList(industries, state) {
    const container = document.getElementById("industry-list-container");
    if (!container) return;

    // 1. Filter-Logik (rein lokal für diesen Rendervorgang)
    // Wir nutzen hier state-Flags, um die Sichtbarkeit zu bestimmen.
    const filteredIndustries = industries.filter(ind =>
        passesSignalFilter(
            window.dataStore?.sparkSignals?.industries?.[ind.industry],
            state.filterBuyIndustries, // Deine State-Flags
            state.filterSellIndustries
        )
    );

    // 2. Sortierung (lokal)
    const sortedIndustries = [...filteredIndustries].sort((a, b) => {
        return Number(a.rsRank ?? 999) - Number(b.rsRank ?? 999);
    });

    // 3. Rows generieren
    const rowsHtml = sortedIndustries.map(item => {
        const isSelected = item.industry === state.industry;
        const score = (item.rsScore ?? 0).toFixed(2);
        
        // Count Berechnung bleibt lokal
        const count = (state.stocks || []).filter(s => 
            (s.industry || s.industry_name) === item.industry
        ).length;

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

   
    // 4. UI-Struktur mit dynamischen Klassen basierend auf state
        container.innerHTML = `
            <div class="sectors-header">
                <div class="sectors-header-title">
                    Industries 
                    <span class="pill pill-count">${sortedIndustries.length}</span>

                    <span class="pill pill-buy ${state.filterBuyIndustries ? 'active' : ''}" 
                        data-type="filterBuyIndustries">Buy</span>
                    
                    <span class="pill pill-sell ${state.filterSellIndustries ? 'active' : ''}" 
                        data-type="filterSellIndustries">Sell</span>
                </div>
                <div class="sectors-header-diffs">
                    <div>∑ Stocks</div><div>D</div><div>W</div><div>M</div>
                </div>
            </div>
            <div class="grid-table">${rowsHtml}</div>
        `;
}