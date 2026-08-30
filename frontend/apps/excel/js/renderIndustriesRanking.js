// apps/lab/render/renderIndustriesRanking.js

import { renderSparklineRanking } from "./renderSparklineRanking.js";

import {
    rankIndustryColors,
    getIndustryColor,
    getIndustryTextColor
} from "../../../shared/logic/rankIndustryColors.js";

export function renderIndustriesRanking(targetId, industries, ranking, dates) {
    const container = document.getElementById(targetId);

    container.innerHTML = `
        <div class="excel-container">
            

            <div id="industries-ranking-week"></div>
            <div id="industries-ranking-month" style="margin-top: 40px;"></div>
            <div id="industries-ranking-quarter" style="margin-top: 40px;"></div>
        </div>
    `;


    renderRanking("industries-ranking-week", "Weekly Ranking", industries, ranking, dates, "week");
    renderRanking("industries-ranking-month", "Monthly Ranking", industries, ranking, dates, "month");
    renderRanking("industries-ranking-quarter", "Quarterly Ranking", industries, ranking, dates, "quarter");
}

function renderRanking(targetId, title, industries, ranking, dates, key) {
    const root = document.getElementById(targetId);

    // Nur die letzten 25 Tage anzeigen
    const visibleDates = dates.slice(-25);

    root.innerHTML = `
        <h4 class="excel-title">${title}</h4>
        <table class="excel-table">
            <thead>
                <tr>
                    <th>Industry</th>
                    <th>Sparkline</th>
                    ${visibleDates.map(d => `<th>${formatDate(d)}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${Object.keys(industries).map(ind => {
                    const fullSeries = ranking[ind][`${key}_rank_series`];
                    const series = fullSeries.slice(-25);   // <<< HIER

                    return `
                        <tr>
                            <td class="excel-sector">${ind}</td>

                            <td class="excel-spark">
                                <canvas width="120" height="30" id="spark-rank-ind-${ind}-${key}"></canvas>
                            </td>

                            ${series.map(v => {
                                const bg = getIndustryColor(v);
                                const fg = getIndustryTextColor(bg);
                                return `<td class="excel-rank" style="background:${bg}; color:${fg}">${v}</td>`;
                            }).join("")}
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    setTimeout(() => {
        Object.keys(industries).forEach(ind => {
            const fullSeries = ranking[ind][`${key}_rank_series`];
            const series = fullSeries.slice(-25);   // <<< UND HIER

            const canvas = document.getElementById(`spark-rank-ind-${ind}-${key}`);
            if (!canvas || !series) return;

            renderSparklineRanking(canvas, series, rankIndustryColors);
        });
    }, 0);
}


function formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}
