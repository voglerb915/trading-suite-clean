// apps/lab/render/renderIndustriesTop20.js


import { renderSparklineRanking } from "./renderSparklineRanking.js";

import {
    getIndustryColor,
    getIndustryTextColor,
    rankIndustryColors
} from "../../../shared/logic/rankIndustryColors.js";

// --- State + Helper ------------------------------------

const industriesTop20State = {
    showTop20: false
};

function getRankArrow(today, yesterday) {
    if (yesterday == null) return "→";
    if (today < yesterday) return "↑";
    if (today > yesterday) return "↓";
    return "→";
}

function getArrowClass(today, yesterday) {
    if (yesterday == null) return "delta-neutral";
    if (today < yesterday) return "delta-up";     // besser geworden
    if (today > yesterday) return "delta-down";   // schlechter geworden
    return "delta-neutral";
}

// --- Renderer -------------------------------------------

export function renderIndustriesTop20(targetId, industries, ranking, dates) {
    
    const container = document.getElementById(targetId);

    container.innerHTML = `
        <div class="excel-container">
            <div class="top20-row">
                <div id="top20-week" class="top20-col"></div>
                <div id="top20-month" class="top20-col"></div>
                <div id="top20-quarter" class="top20-col"></div>
            </div>
        </div>
    `;


    renderTop20("top20-week", "Week", industries, ranking, dates, "week");
    renderTop20("top20-month", "Month", industries, ranking, dates, "month");
    renderTop20("top20-quarter", "Quarter", industries, ranking, dates, "quarter");
}

function renderTop20(targetId, title, industries, ranking, dates, key) {
    const root = document.getElementById(targetId);

    // Industries in ein Array umwandeln
    let rows = Object.keys(ranking).map(ind => {
        const series = ranking[ind][`${key}_rank_series`] || [];

        const today = series[0] ?? null;
        const yesterday = series[1] ?? null;

        return {
            industry: ind,
            sector: ranking[ind].sector,   // ⭐ jetzt korrekt
            series,
            today,
            yesterday
        };
    });

    // Sortierung nach heutigem Rank
    rows = rows.filter(r => r.today != null).sort((a, b) => a.today - b.today);

    // Optional Top 20% filtern
    let rowsToShow = rows;
    if (industriesTop20State.showTop20) {
        const limit = Math.max(1, Math.ceil(rows.length * 0.2));
        rowsToShow = rows.slice(0, limit);
    }

    // Render HTML
    root.innerHTML = `
        <div class="top20-header">
            <h4 class="excel-title">Industries – ${title}</h4>
            <div id="pill-top20-${key}" class="pill ${industriesTop20State.showTop20 ? "active" : ""}">
                Top 20%
            </div>
        </div>

        <table class="excel-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>−1D</th>
                    <th>Sparkline</th>
                    <th>Industry</th>
                    <th>Sector</th>
                </tr>
            </thead>
            <tbody>
                ${rowsToShow.map(row => {
                    const bg = getIndustryColor(row.today);
                    const fg = getIndustryTextColor(bg);
                    const arrow = getRankArrow(row.today, row.yesterday);
                    const arrowClass = getArrowClass(row.today, row.yesterday);

                    return `
                        <tr>
                            <td class="rank-col" style="background:${bg}; color:${fg}; font-weight:bold">
                                ${row.today}
                            </td>

                            <td class="rank-delta">
                                ${row.yesterday ?? "–"}
                                <span class="rank-delta-arrow ${arrowClass}">${arrow}</span>
                            </td>

                            <td class="excel-spark">
                                <canvas width="120" height="30" id="spark-top20-${row.industry}-${key}"></canvas>
                            </td>

                            <td class="excel-sector">${row.industry}</td>
                            <td class="excel-sector">${row.sector}</td>
                        </tr>
                    `;
                    
                }).join("")}
            </tbody>
        </table>
    `;

    // Pill aktivieren
    const pill = document.getElementById(`pill-top20-${key}`);
    if (pill) {
        pill.onclick = () => {
            industriesTop20State.showTop20 = !industriesTop20State.showTop20;
            renderTop20(targetId, title, industries, ranking, dates, key);
        };
    }

    // Sparklines zeichnen
    setTimeout(() => {
        rowsToShow.forEach(row => {
            const canvas = document.getElementById(`spark-top20-${row.industry}-${key}`);
            if (!canvas) return;

            renderSparklineRanking(canvas, row.series, rankIndustryColors);
        });
    }, 0);
}

