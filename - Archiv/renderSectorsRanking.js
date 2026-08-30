import { renderSparkline } from "./renderSparkline.js";
import { renderSparklineRanking } from "./renderSparklineRanking.js";

/* ================================
   Ranking-Farbskala 1–11
   ================================ */
// Neue 11er Farbskala (dunkelrot → dunkelgrün)
const sectorRankColors = {
    1:  "#006400",   // dunkelgrün
    2:  "#3EC000",
    3:  "#78E000",
    4:  "#A8F000",
    5:  "#D0F200",
    6:  "#F0E000",
    7:  "#EBCC00",
    8:  "#D39C00",
    9:  "#BB6800",
    10: "#A33400",
    11: "#8B0000"    // dunkelrot
};

function getSectorColor(rank) {
    return sectorRankColors[rank] || "#000";
}

function getTextColor(bgColor) {
    const r = parseInt(bgColor.substr(1, 2), 16);
    const g = parseInt(bgColor.substr(3, 2), 16);
    const b = parseInt(bgColor.substr(5, 2), 16);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 140 ? "#fff" : "#000";
}

export function renderSectorsRanking(targetId, sectors, ranking, dates) {
    const container = document.getElementById(targetId);

    container.innerHTML = `
        <div class="excel-container">
            <h3 class="excel-title">Ranking – Sectors × 15 Tage</h3>

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

            renderSparklineRanking(canvas, series, sectorRankColors);

        });
    }, 0);
}

function formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}
