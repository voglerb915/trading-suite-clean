import { sectorClasses } from "../../../../shared/logic/sectorColors.js";
import { renderRankCircle } from "../helpers/renderHelpers.js";


export function renderSignalsList(stocks, state, container) {
    if (!container) return;

    // DEBUG: Prüfe die Datenquelle direkt hier
    const midSignals = window.dataStore?.midSignals?.stocks || {};
    console.log("DEBUG: renderSignalsList - midSignals vorhanden:", Object.keys(midSignals).length > 0);
    console.log("DEBUG: Anzahl Stocks übergeben:", stocks.length);

    // 1. Filter anwenden
const filtered = (stocks || []).filter(s => {
    const spark = window.dataStore?.sparkSignals?.stocks?.[s.ticker];
    const mid = window.dataStore?.midSignals?.stocks?.[s.ticker];

    const sparkActive = state.filterBuySignals || state.filterSellSignals;
    const midActive = state.filterLongMid || state.filterExitMid;

    if (!sparkActive && !midActive) return true;

    // Spark: 'entry' für Buy, 'exit' für Sell
    const sparkMatch = (state.filterBuySignals && spark?.signal === "entry") || 
                       (state.filterSellSignals && spark?.signal === "exit");

    // Wir nutzen jetzt signal_type und Großschreibung wie in der Konsole gesehen
    const midMatch = (state.filterLongMid && mid?.signal_type === 'LONG') || 
                     (state.filterExitMid && mid?.signal_type === 'EXIT');

    if (sparkActive && !sparkMatch) return false;
    if (midActive && !midMatch) return false;

    return true;
});
    console.log("DEBUG: Nach Filter verbleiben:", filtered.length);

    // 2. Pillen im Tools-Bereich aktualisieren
// 2. Pillen im Tools-Bereich aktualisieren
    const pillContainer = document.getElementById("tools-pill-container");
    if (pillContainer) {
        pillContainer.innerHTML = `
            <span class="pill pill-count">${filtered.length}</span>
            <span class="pill pill-buy ${state.filterBuySignals ? 'active' : ''}" data-type="filterBuySignals">Buy</span>
            <span class="pill pill-sell ${state.filterSellSignals ? 'active' : ''}" data-type="filterSellSignals">Sell</span>
            <span class="pill pill-long ${state.filterLongMid ? 'active' : ''}" data-type="filterLongMid">Long</span>
            <span class="pill pill-exit ${state.filterExitMid ? 'active' : ''}" data-type="filterExitMid">Exit</span>
        `;
    }

    // 3. Liste rendern
    if (filtered.length === 0) {
        container.innerHTML = `<ul><li class="stock-item empty">Keine Treffer für Signale (Filter aktiv?)</li></ul>`;
        return;
    }


    const html = filtered.map((item, idx) => {
        // ... (dein restlicher Code ab hier bleibt gleich)
        const isSelected = item.ticker === state?.ticker;
        const sectorClass = sectorClasses[item.sector] ?? "";
        const position = idx + 1;
        const displaySector = item.sector ?? "—";
        const displayIndustry = item.industry ?? "—";
        const clickHandler = `onclick="handleStockClick('${item.ticker}', '${item.industry}', '${item.sector}')"`;

        const globalRank = item.globalRank ?? item.rsRank ?? item.rank ?? null;
        const bottomValue = globalRank != null ? `Global: ${globalRank}` : "Global: —";

        const rawTop = item.strategyValue ?? item.value ?? item.rsScore ?? item.score ?? null;
        let topValue;
        
        if (rawTop != null) {
            const formatted = (item.strategyValue != null || item.value != null)
                ? `${rawTop.toFixed(2)}%`
                : rawTop.toFixed(2);

            topValue = state.strategy && state.strategy !== "none"
                ? `<strong class="strategy-value-strong">${formatted}</strong>`
                : `<span class="score-value">${formatted}</span>`;
        } else {
            topValue = "—";
        }

        return `
            <li class="stock-item ${sectorClass} ${isSelected ? 'highlight-ticker' : ''}"
                data-stock="${item.ticker}" ${clickHandler}>
                <div class="stock-row-inner">
                    <div class="stock-left">
                        ${isSelected ? '▶ ' : ''}
                        ${renderRankCircle(position, window.dataStore?.sparkSignals?.stocks?.[item.ticker])}
                        <span class="stock-ticker">${item.ticker}</span><br>
                        <span class="stock-sub">${displaySector} | ${displayIndustry}</span>
                    </div>
                    <div class="stock-right">
                        ${topValue}<br>
                        ${bottomValue}
                    </div>
                </div>
            </li>
        `;
    }).join('');

    container.innerHTML = `<ul>${html}</ul>`;
}