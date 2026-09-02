// apps/charting-tool/js/renderer/stockChartRenderer.js
export function renderStockChart(ctx, { datasets, xMin, xMax, yMin, yMax }, days) {
    if (!ctx || !datasets || datasets.length === 0) return;

    const quadrantPlugin = {
        id: "stockQuadrantBackground",
        beforeDraw(chart) {
            const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
            if (!x || !y) return;
            const xMid = x.getPixelForValue(0);
            const yMid = y.getPixelForValue(0);
            ctx.save();
            ctx.fillStyle = "rgba(40, 167, 69, 0.2)";
            ctx.fillRect(xMid, top, right - xMid, yMid - top);
            ctx.fillStyle = "rgba(0, 123, 255, 0.2)";
            ctx.fillRect(left, top, xMid - left, yMid - top);
            ctx.fillStyle = "rgba(220, 53, 69, 0.2)";
            ctx.fillRect(left, yMid, xMid - left, bottom - yMid);
            ctx.fillStyle = "rgba(255, 193, 7, 0.2)";
            ctx.fillRect(xMid, yMid, right - xMid, bottom - yMid);
            ctx.strokeStyle = "#555";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(xMid, top); ctx.lineTo(xMid, bottom); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(left, yMid); ctx.lineTo(right, yMid); ctx.stroke();
            ctx.restore();
        }
    };

    const stockLabelsPlugin = {
        id: "stockLabels",
        afterDatasetsDraw(chart) {
            const { ctx, scales: { x, y } } = chart;
            if (!x || !y) return;
            ctx.save();
            ctx.font = "10px sans-serif"; ctx.fillStyle = "#ccc"; ctx.textBaseline = "middle";
            chart.data.datasets.forEach(ds => {
                if (ds.type === "scatter" && ds.data.length > 0) {
                    const p = ds.data[0];
                    const px = x.getPixelForValue(p.x), py = y.getPixelForValue(p.y);
                    if (!isNaN(px)) ctx.fillText(p.ticker, px + 8, py - 3);
                }
            });
            ctx.restore();
        }
    };

    if (window.stockChartInstance) window.stockChartInstance.destroy();

    window.stockChartInstance = new Chart(ctx, {
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Relative Stärke", color: "#aaa" },
                    min: xMin,
                    max: xMax,
                    grid: { color: "#222" },
                    ticks: { color: "#888" }
                },
                y: {
                    type: "linear",
                    title: { display: true, text: `Momentum (${days}-Tage)`, color: "#aaa" },
                    min: yMin,
                    max: yMax,
                    grid: { color: "#222" },
                    ticks: { color: "#888" }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: item => item.dataset.type === "scatter",
                    callbacks: {
                        label: ctx => ` ${ctx.raw.label} (${ctx.raw.ticker}) [${ctx.raw.sector}]: Score ${ctx.raw.x.toFixed(1)} | Mom ${ctx.raw.y.toFixed(1)}`
                    }
                }
            }
        },
        plugins: [quadrantPlugin, stockLabelsPlugin]
    });
}
