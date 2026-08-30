// apps/lab/render/renderExcelRawData.js

import { renderSparkline } from "./renderSparkline.js";

export function renderSectorsPerformance(targetId, sectors, dates) {
    const container = document.getElementById(targetId);

    container.innerHTML = `
        <div class="excel-container">
            
            <div id="excel-matrix-week"></div>
            <div id="excel-matrix-month" style="margin-top: 40px;"></div>
            <div id="excel-matrix-quarter" style="margin-top: 40px;"></div>
        </div>
    `;

    renderMatrixTable("excel-matrix-week", "Weekly Performance", sectors, dates, "week");
    renderMatrixTable("excel-matrix-month", "Monthly Performance", sectors, dates, "month");
    renderMatrixTable("excel-matrix-quarter", "Quarterly Performance", sectors, dates, "quarter");
}


// ⬇⬇⬇ WICHTIG: renderMatrixTable MUSS HIER BLEIBEN
function renderMatrixTable(targetId, title, sectors, dates, key) {
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
                ${Object.keys(sectors).map(sector => `
                    <tr>
                        <td class="excel-sector">${sector}</td>

                        <td class="excel-spark">
                            <canvas width="120" height="30" id="spark-${sector}-${key}"></canvas>
                        </td>

                        ${sectors[sector][key].map(v => {
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
        Object.keys(sectors).forEach(sector => {
            const values = sectors[sector][key];
            const canvas = document.getElementById(`spark-${sector}-${key}`);
            if (canvas) renderSparkline(canvas, values);
        });
    }, 0);
}


function formatDate(d) {
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}
