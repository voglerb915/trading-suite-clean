import { getSectorClass, getDiffColor, formatDiff, renderRankCircle } from "../../../helpers/renderHelpers.js";

export function renderIndustryItem(item, state, activeSector) {
    const isSelected = item.industry === state.industry;
    const score = (item.rsScore ?? 0).toFixed(2);
    
    const count = (state.stocks || []).filter(s => 
        (s.industry || s.industry_name) === item.industry
    ).length;

    // --- Kontextueller Vergleichspunkt ---
    let comparisonDotHtml = '';
    if (activeSector && typeof activeSector.rsScore === 'number' && typeof item.rsScore === 'number') {
        const isOutperforming = item.rsScore >= activeSector.rsScore;
        const dotColor = isOutperforming ? '#22c55e' : '#ef4444'; 
        const tooltipText = isOutperforming 
            ? `Stärker als Sektor ${activeSector.sector} (${score} vs ${activeSector.rsScore.toFixed(2)})` 
            : `Schwächer als Sektor ${activeSector.sector} (${score} vs ${activeSector.rsScore.toFixed(2)})`;

        comparisonDotHtml = `
            <span style="background-color: ${dotColor}; display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;" title="${tooltipText}"></span>
        `;
    }

    return `
        <div class="grid-row-sector stock-item ${isSelected ? "highlight-sector" : ""}"
             data-industry="${item.industry}">
            <div class="grid-cell ${getSectorClass(item.sector)}" style="display: flex; align-items: center; gap: 8px;">
                <!-- Feste Breite für die Rank-Pille, damit nichts springt -->
                <div style="width: 45px; flex-shrink: 0; text-align: center;">
                    ${renderRankCircle(item.rsRank, window.dataStore?.sparkSignals?.industries?.[item.industry])}
                </div>
                <!-- Container für Punkt + Name, damit alles schnurgerade untereinander liegt -->
                <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${comparisonDotHtml}
                    <span>${isSelected ? '▶ ' : ''}${item.industry} (${score})</span>
                </div>
            </div>
            <div class="grid-cell count-cell">[${count}]</div>
            <div class="grid-cell" style="color:${getDiffColor(item.diffD)};">${formatDiff(item.diffD)}</div>
            <div class="grid-cell" style="color:${getDiffColor(item.diffW)};">${formatDiff(item.diffW)}</div>
            <div class="grid-cell" style="color:${getDiffColor(item.diffM)};">${formatDiff(item.diffM)}</div>
        </div>
    `;
}