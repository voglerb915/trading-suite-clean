// apps/excel/js/renderSectorsRanking.js

import { renderSparkline } from "./renderSparkline.js";
import { renderSparklineRanking } from "./renderSparklineRanking.js";

// Zentrale Farbskala für SECTORS
import {
    rankSectorColors,
    getSectorColor,
    getTextColor
} from "../../../shared/logic/rankSectorColors.js";

export function renderSectorsRanking(targetId, sectors, ranking, dates) {
    const container = document.getElementById(targetId);

    container.innerHTML = `
        <div class="excel-container">
            
            <div id="ranking-matrix-week"></div>
            <div id="ranking-matrix-month" style="margin-top: 40px;"></div>
            <div id="ranking-matrix-quarter" style="margin-top: 40px;"></div>
        </div>
    `;

    renderRankingTable("ranking-matrix-week", "Weekly Ranking", sectors, ranking, dates, "week");
    renderRankingTable("ranking-matrix-month", "Monthly Ranking", sectors, ranking, dates, "month");
    renderRankingTable("ranking-matrix-quarter", "Quarterly Ranking", sectors, ranking, dates, "quarter");
}

function renderRankingTable(targetId, title, sectors, ranking, dates, key) {
    const root = document.getElementById(targetId);

    root.innerHTML = `
        <h4 class="excel-title">${title}</h4>
        <table class="excel-table">
            <thead>
                <tr>
                    <th>Sector</th>
                    <th>Sparkline</th>
                    ${dates.map(d => `<th>${formatDate(d)}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${Object.keys(sectors).map(sector => {
                    const series = ranking[sector][`${key}_rank_series`];

                    return `
                        <tr>
                            <td class="excel-sector">${sector}</td>

                            <td class="excel-spark">
                                <canvas width="120" height="30" id="spark-rank-${sector}-${key}"></canvas>
                            </td>

                            ${series.map(v => {
                                const bg = getSectorColor(v);
                                const fg = getTextColor(bg);
                                return `<td class="excel-rank" style="background:${bg}; color:${fg}">${v}</td>`;
                            }).join("")}
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    // Sparkline zeichnen
    setTimeout(() => {
        Object.keys(sectors).forEach(sector => {
            const series = ranking[sector][`${key}_rank_series`];
            const canvas = document.getElementById(`spark-rank-${sector}-${key}`);

            if (!canvas || !series) return;

            renderSparklineRanking(canvas, series, rankSectorColors);
        });
    }, 0);
}

function formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit"
    });
}
