const fmt = v => (typeof v === "number" ? v.toFixed(2) : (v ?? "—"));

export function renderStockTooltip(mergedItem, strategy) {
    if (strategy === "stage3topping") {
        return `
            <span class="score-tooltip-trigger" style="margin-right:8px; cursor:help;">
                📊
                <div class="score-tooltip">
                    <div class="score-row">
                        <span class="score-label">S1 StateActive</span>
                        <span class="score-value">${fmt(mergedItem.score_stateActive)}</span>
                        <span class="score-raw">${mergedItem.stateActive}</span>
                    </div>
                    <div class="score-row">
                        <span class="score-label">S2 Age</span>
                        <span class="score-value">${fmt(mergedItem.score_age)}</span>
                        <span class="score-raw">${mergedItem.daysAbove}</span>
                    </div>
                    <div class="score-row">
                        <span class="score-label">S3 Slope</span>
                        <span class="score-value">${fmt(mergedItem.score_slope)}</span>
                        <span class="score-raw">${mergedItem.slopeVal}</span>
                    </div>
                    <div class="score-row">
                        <span class="score-label">S4 IndRank</span>
                        <span class="score-value">${fmt(mergedItem.score_indRank)}</span>
                        <span class="score-raw">${mergedItem.indRank}</span>
                    </div>
                    <div class="score-row">
                        <span class="score-label">S5 SMA Dist</span>
                        <span class="score-value">${fmt(mergedItem.score_smaDist)}</span>
                        <span class="score-raw">${mergedItem.smaDist}</span>
                    </div>
                    <div class="score-total">
                        <span class="score-label">Total</span>
                        <span class="score-value">${fmt(mergedItem.totalScore)}</span>
                    </div>
                </div>
            </span>
        `;
    } 
    
    if (strategy === "insideday52w") {
        return `
            <span class="score-tooltip-trigger" style="margin-right:8px; cursor:help;">
                📊
                <div class="score-tooltip">
                    <div class="score-row">
                        <span class="score-label">Tightness</span>
                        <span class="score-value">${fmt(mergedItem.tightness)}</span>
                    </div>
                    <div class="score-row">
                        <span class="score-label">VMA 20</span>
                        <span class="score-value">${fmt(mergedItem.vma_20)}</span>
                    </div>
                    <div class="score-row">
                        <span class="score-label">Setup Status</span>
                        <span class="score-value">${mergedItem.setupStatus ?? "—"}</span>
                    </div>
                    <div class="score-row">
                        <span class="score-label">Anchor High</span>
                        <span class="score-value">${fmt(mergedItem.anchorHigh)}</span>
                    </div>
                    <div class="score-row">
                        <span class="score-label">Anchor Low</span>
                        <span class="score-value">${fmt(mergedItem.anchorLow)}</span>
                    </div>
                </div>
            </span>
        `;
    }

    return `<span></span>`;
}