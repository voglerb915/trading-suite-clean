// apps/charting-tool/js/renderer/sectorChartRenderer.js
export function renderSectorChart(ctx, { datasets, xMin, xMax, yMin, yMax }) {
    if (!ctx || !datasets || datasets.length === 0) return;

    const sectorQuadrantBackground = {
        id: "sectorQuadrantBackground",
        beforeDraw(chart) {
            const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
            if (!x || !y) return;

            const xMid = x.getPixelForValue(0);
            const yMid = y.getPixelForValue(0);

            ctx.save();
            ctx.fillStyle = "rgba(40, 167, 69, 0.20)";
            ctx.fillRect(xMid, top, right - xMid, yMid - top);
            ctx.fillStyle = "rgba(0, 123, 255, 0.20)";
            ctx.fillRect(left, top, xMid - left, yMid - top);
            ctx.fillStyle = "rgba(220, 53, 69, 0.20)";
            ctx.fillRect(left, yMid, xMid - left, bottom - yMid);
            ctx.fillStyle = "rgba(255, 193, 7, 0.20)";
            ctx.fillRect(xMid, yMid, right - xMid, bottom - yMid);

            ctx.strokeStyle = "#555";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xMid, top);
            ctx.lineTo(xMid, bottom);
            ctx.moveTo(left, yMid);
            ctx.lineTo(right, yMid);
            ctx.stroke();
            ctx.restore();
        }
    };

    const sectorLabelsPlugin = {
        id: "sectorLabels",
        afterDatasetsDraw(chart) {
            const { ctx, scales: { x, y } } = chart;
            if (!x || !y) return;

            ctx.save();
            ctx.font = "11px sans-serif";
            ctx.fillStyle = "#ddd";
            ctx.textBaseline = "middle";

            chart.data.datasets.forEach(dataset => {
                if (dataset.type === "scatter" && dataset.data.length > 0) {
                    const p = dataset.data[0];
                    const pixelX = x.getPixelForValue(p.x);
                    const pixelY = y.getPixelForValue(p.y);
                    if (!isNaN(pixelX) && !isNaN(pixelY)) {
                        ctx.fillText(p.ticker, pixelX + 9, pixelY - 3);
                    }
                }
            });
            ctx.restore();
        }
    };

    if (window.sectorChartInstance) {
        window.sectorChartInstance.destroy();
    }

    window.sectorChartInstance = new Chart(ctx, {
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Score (Relative Stärke)", color: "#aaa" },
                    min: xMin,
                    max: xMax,
                    grid: { color: "#222" },
                    ticks: { color: "#888" }
                },
                y: {
                    type: "linear",
                    title: { display: true, text: "Momentum", color: "#aaa" },
                    min: yMin,
                    max: yMax,
                    grid: { color: "#222" },
                    ticks: { color: "#888" }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: tooltipItem => tooltipItem.dataset.type === "scatter",
                    callbacks: {
                        label: context => {
                            const p = context.raw;
                            if (!p) return "";
                            return ` ${p.sector} (${p.ticker}): Score ${p.x > 0 ? "+" : ""}${p.x.toFixed(1)} | Momentum ${p.y > 0 ? "+" : ""}${p.y.toFixed(1)}`;
                        }
                    }
                }
            }
        },
        plugins: [sectorQuadrantBackground, sectorLabelsPlugin]
    });
}
