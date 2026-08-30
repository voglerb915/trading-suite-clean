// apps/lab/render/renderIndustriesPerformance.js

import { renderSparkline } from "./renderSparkline.js";

export function renderIndustriesPerformance(targetId, industries, dates) {
    const container = document.getElementById(targetId);

    container.innerHTML = `
        <div class="excel-container">
            
            <div id="industries-matrix-week"></div>
            <div id="industries-matrix-month" style="margin-top: 40px;"></div>
            <div id="industries-matrix-quarter" style="margin-top: 40px;"></div>
        </div>
    `;

    renderMatrix("industries-matrix-week", "Weekly Performance", industries, dates, "week");
    renderMatrix("industries-matrix-month", "Monthly Performance", industries, dates, "month");
    renderMatrix("industries-matrix-quarter", "Quarterly Performance", industries, dates, "quarter");
}

function renderMatrix(targetId, title, industries, dates, key) {
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
                ${Object.keys(industries).map(ind => `
                    <tr>
                        <td class="excel-sector">${ind}</td>

                        <td class="excel-spark">
                            <canvas width="120" height="30" id="spark-ind-${ind}-${key}"></canvas>
                        </td>

                        ${industries[ind][key].map(v => {
                            const num = Number(v);
                            const cls = num >= 0 ? "excel-pos" : "excel-neg";
                            return `<td class="${cls}">${num.toFixed(2)}</td>`;
                        }).join("")}
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    setTimeout(() => {
        Object.keys(industries).forEach(ind => {
            const values = industries[ind][key];
            const canvas = document.getElementById(`spark-ind-${ind}-${key}`);
            if (canvas) renderSparkline(canvas, values);
        });
    }, 0);
}

function formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}
