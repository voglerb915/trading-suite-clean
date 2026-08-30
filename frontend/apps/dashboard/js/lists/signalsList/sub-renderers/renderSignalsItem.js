// renderSignalsItem.js
import { sectorClasses } from "/shared/logic/sectorColors.js";
import { renderRankCircle, renderTrendBars } from "../../../helpers/renderHelpers.js";

export function renderSignalsItem(item, idx, state) {
    const isSelected = item.ticker === state?.ticker;
    const sectorClass = sectorClasses[item.sector] ?? "";
    const position = idx + 1;
    const displaySector = item.sector ?? "—";
    const displayIndustry = item.industry ?? "—";
    
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

    // Passendes Signal für den Ticker aus midSignals holen
    const midSignalItem = window.dataStore?.midSignals?.data?.find(s => s.ticker === item.ticker);
    const marketPhase = midSignalItem?.phase_stock ?? null;
    const phaseColor = midSignalItem?.phase_color ?? "gray";
    const daysInTrend = midSignalItem?.days_in_trend ?? 1;

    let phasePille = "";
    if (marketPhase != null) {
        phasePille = `<span class="market-phase-pill phase-${phaseColor}">P${marketPhase}</span>`;
    }

    const trendBars = renderTrendBars(daysInTrend);
    const tickerSignalData = window.dataStore?.sparkSignals?.stocks?.[item.ticker] || {};

    const li = document.createElement("li");
    li.className = `stock-item ${sectorClass} ${isSelected ? 'highlight-ticker' : ''}`;
    li.setAttribute("data-stock", item.ticker);
    
    if (typeof handleStockClick === "function") {
        li.setAttribute("onclick", `handleStockClick('${item.ticker}', '${item.industry}', '${item.sector}')`);
    }

    li.innerHTML = `
        <div class="stock-row-inner">
            <div class="stock-left">
                ${isSelected ? '▶ ' : ''}
                ${renderRankCircle(position, tickerSignalData)}
                <span class="stock-ticker">${item.ticker}</span><br>
                <span class="stock-sub">${displaySector} | ${displayIndustry}</span>
            </div>
            <div class="stock-right">
                ${trendBars} ${phasePille} ${topValue}<br>
                ${bottomValue}
            </div>
        </div>
    `;

    return li;
}