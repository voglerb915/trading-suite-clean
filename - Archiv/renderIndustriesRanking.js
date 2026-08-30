// apps/lab/render/renderIndustriesRanking.js

import { renderSparklineRanking } from "./renderSparklineRanking.js";

// Neue Farbskala
const rankColors = {
    1: "#006400",
    2: "#3EC000",
    3: "#78E000",
    4: "#A8F000",
    5: "#D0F200",
    6: "#F0E000",
    7: "#EBCC00",
    8: "#D39C00",
    9: "#BB6800",
    10: "#A33400",
    11: "#8B0000",
    12: "#7A0000",
    13: "#690000",
    14: "#580000",
    15: "#470000",
    16: "#360000"
};

// Mapping: Rang → Farbklasse
function getColorForRank(rank) {
    const abs = Math.abs(rank);          // falls negative Werte
    let cls = Math.ceil(abs / 9);        // 1–144 → 1–16

    if (cls < 1) cls = 1;
    if (cls > 16) cls = 16;

    return rankColors[cls];
}

// Textfarbe abhängig von Hintergrund
function getTextColor(bgColor) {
    const r = parseInt(bgColor.substr(1, 2), 16);
    const g = parseInt(bgColor.substr(3, 2), 16);
    const b = parseInt(bgColor.substr(5, 2), 16);

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 140 ? "#fff" : "#000";
}

export function renderIndustriesRanking(targetId, industries, ranking, dates) {
    const container = document.getElementById(targetId);

    container.innerHTML = `
        <div class="excel-container">
            <h3 class="excel-title">Ranking – Industries × 15 Tage</h3>

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

    root.innerHTML = `
        <h4 class="excel-title">${title}</h4>
        <table class="excel-table">
            <thead>
                <tr>
                    <th>Industry</th>
                    <th>Sparkline</th>
                    ${dates.map(d => `<th>${formatDate(d)}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${Object.keys(industries).map(ind => {
                    const series = ranking[ind][`${key}_rank_series`];

                    return `
                        <tr>
                            <td class="excel-sector">${ind}</td>

                            <td class="excel-spark">
                                <canvas width="120" height="30" id="spark-rank-ind-${ind}-${key}"></canvas>
                            </td>

                            ${series.map(v => {
                                const bg = getColorForRank(v);
                                const fg = getTextColor(bg);
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
            const series = ranking[ind][`${key}_rank_series`];
            const canvas = document.getElementById(`spark-rank-ind-${ind}-${key}`);

            if (!canvas || !series) return;

            renderSparklineRanking(canvas, series, rankColors);


        });
    }, 0);
}

function formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}
