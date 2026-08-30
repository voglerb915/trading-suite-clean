import { renderRankCircle } from "../../../helpers/renderHelpers.js";

export function renderEtfsItem(etf, idx, state) {
    const position = idx + 1;
    const ticker = etf.ticker || "—";      
    const companyName = etf.name || "—";    
    const rank = etf.rankWonDb !== undefined ? etf.rankWonDb : position;

    let score = "—";
    if (etf.score !== undefined && etf.score !== null) {
        const parsedScore = Number(String(etf.score).replace(",", "."));
        score = !isNaN(parsedScore) ? parsedScore.toFixed(2) : "—";
    }

    return `
        <li class="etf-item" data-stock="${ticker}" onclick="if(window.openChartModal) window.openChartModal('${ticker}')">
            <div class="etf-row-inner">
                <!-- LINKS -->
                <div class="etf-left">
                    ${renderRankCircle(rank)}
                    <div class="etf-info-col">
                        <span class="etf-ticker">${ticker}</span>
                        <span class="etf-sub">${companyName}</span>
                    </div>
                </div>

                <!-- RECHTS -->
                <div class="etf-right">
                    <span class="etf-score-value">${score}</span>
                    <span class="etf-rank-label">Rank: ${rank}</span>
                </div>
            </div>
        </li>
    `;
}