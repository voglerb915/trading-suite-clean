import { sectorClasses } from "../../../../../../shared/logic/sectorColors.js";
import { renderRankCircle } from "../../../helpers/renderHelpers.js";
import { renderStockTooltip } from "./renderStockTooltip.js";

export function renderStockItem(mergedItem, idx, state, activeIndustry) {
    const isSelected = mergedItem.ticker === state?.ticker;
    const sectorClass = sectorClasses[mergedItem.sector] ?? "";
    const position = idx + 1;

    const displaySector = mergedItem.sector ?? "—";
    const displayIndustry = mergedItem.industry ?? "—";

    const globalRank = mergedItem.globalRank ?? mergedItem.rsRank ?? mergedItem.rank ?? null;
    const bottomValue = globalRank != null ? `Global: ${globalRank}` : "Global: —";

    let rawTop = null;
    switch (state.strategy) {
        case "high52w":
        case "nearhigh52":
            rawTop = mergedItem.strategyValue ?? mergedItem.value ?? null;
            break;
        case "insideday52w":
            rawTop = mergedItem.strategyValue ?? mergedItem.tightness ?? mergedItem.value ?? null;
            break;
        case "stage3topping":
            rawTop = mergedItem.strategyValue ?? mergedItem.score ?? mergedItem.totalScore ?? null;
            break;
        case "none":
        default:
            rawTop = mergedItem.strategyValue ?? mergedItem.value ?? mergedItem.rsScore ?? mergedItem.score ?? null;
            break;
    }

    let topValue;
    if (rawTop != null) {
        const percentStrategies = ["high52w", "insideday52w", "nearhigh52"];
        const formatted = percentStrategies.includes(state.strategy)
            ? `${rawTop.toFixed(2)}%`
            : rawTop.toFixed(2);

        topValue = state.strategy && state.strategy !== "none"
            ? `<strong class="strategy-value-strong">${formatted}</strong>`
            : `<span class="score-value">${formatted}</span>`;
    } else {
        topValue = "—";
    }

    const tooltipHtml = renderStockTooltip(mergedItem, state.strategy);

    // --- Kontextueller Vergleichspunkt ---
    let comparisonDotHtml = '';
    const stockScore = mergedItem.rsScore ?? mergedItem.score ?? rawTop;
    if (activeIndustry && typeof activeIndustry.rsScore === 'number' && typeof stockScore === 'number') {
        const isOutperforming = stockScore >= activeIndustry.rsScore;
        const dotColor = isOutperforming ? '#22c55e' : '#ef4444'; 
        const tooltipText = isOutperforming 
            ? `Stärker als Industrie ${activeIndustry.industry} (${stockScore.toFixed(2)} vs ${activeIndustry.rsScore.toFixed(2)})` 
            : `Schwächer als Industrie ${activeIndustry.industry} (${stockScore.toFixed(2)} vs ${activeIndustry.rsScore.toFixed(2)})`;

        comparisonDotHtml = `
            <span style="background-color: ${dotColor}; display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;" title="${tooltipText}"></span>
        `;
    }

    return `
        <li class="stock-item ${sectorClass} ${isSelected ? 'highlight-ticker' : ''}"
            data-stock="${mergedItem.ticker}">

            <div class="stock-row-inner">
                <!-- LINKS: Grid-Layout, exakt analog zur Signals-Liste -->
                <div class="stock-left" style="display: grid; grid-template-columns: auto 1fr; align-items: center; column-gap: 8px; row-gap: 2px;">
                    <!-- Spalte 1, Zeile 1: Rank-Pille -->
                    <div style="grid-column: 1; grid-row: 1; text-align: center;">
                        ${renderRankCircle(position, window.dataStore?.sparkSignals?.stocks?.[mergedItem.ticker])}
                    </div>
                    
                    <!-- Spalte 2, Zeile 1: Punkt + Ticker -->
                    <div style="grid-column: 2; grid-row: 1; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        ${isSelected ? '▶ ' : ''}
                        ${comparisonDotHtml}
                        <span class="stock-ticker">${mergedItem.ticker}</span>
                    </div>

                    <!-- Spalte 1 & 2, Zeile 2: Sektor | Industrie (läuft unterm Rank durch) -->
                    <div style="grid-column: 1 / -1; grid-row: 2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <span class="stock-sub">${displaySector} | ${displayIndustry}</span>
                    </div>
                </div>

                <!-- RECHTS -->
                <div class="stock-right">
                    <div style="display: grid; grid-template-columns: auto 1fr; align-items: center; font-weight: bold; color: #444; font-size: 1rem; white-space: nowrap; text-align: right;">
                        ${tooltipHtml}
                        <span>${topValue}</span>
                    </div>
                    <div>${bottomValue}</div>
                </div>
            </div>
        </li>
    `;
}