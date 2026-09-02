// apps/charting-tool/js/renderer/industryChartRenderer.js
export function renderIndustryChart(ctx, { datasets, xMin, xMax, yMin, yMax }, days) {
    if (!ctx || !datasets || datasets.length === 0) return;

    const xCenter = 0;
    const yCenter = 0;

    const quadrantPlugin = {
        id: "industryQuadrantBackground",
        beforeDraw(chart) {
            const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
            if (!x || !y) return;

            const xMid = x.getPixelForValue(xCenter);
            const yMid = y.getPixelForValue(yCenter);

            ctx.save();

            ctx.fillStyle = "rgba(40, 167, 69, 0.30)";
            ctx.fillRect(xMid, top, right - xMid, yMid - top);

            ctx.fillStyle = "rgba(0, 123, 255, 0.30)";
            ctx.fillRect(left, top, xMid - left, yMid - top);

            ctx.fillStyle = "rgba(220, 53, 69, 0.30)";
            ctx.fillRect(left, yMid, xMid - left, bottom - yMid);

            ctx.fillStyle = "rgba(255, 193, 7, 0.30)";
            ctx.fillRect(xMid, yMid, right - xMid, bottom - yMid);

            ctx.strokeStyle = "#555";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            ctx.beginPath();
            ctx.moveTo(xMid, top);
            ctx.lineTo(xMid, bottom);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(left, yMid);
            ctx.lineTo(right, yMid);
            ctx.stroke();
            ctx.restore();
        }
    };

    const industryLabelsPlugin = {
        id: "industryLabels",
        afterDatasetsDraw(chart) {
            const { ctx, scales: { x, y } } = chart;
            if (!x || !y) return;

            ctx.save();
            ctx.font = "10px sans-serif";
            ctx.fillStyle = "#ccc";
            ctx.textBaseline = "middle";

            chart.data.datasets.forEach(dataset => {
                if (dataset.type === "scatter" && dataset.data.length > 0) {
                    const p = dataset.data[0];
                    const pixelX = x.getPixelForValue(p.x);
                    const pixelY = y.getPixelForValue(p.y);
                    if (!isNaN(pixelX) && !isNaN(pixelY)) {
                        ctx.fillText(p.ticker, pixelX + 8, pixelY - 3);
                    }
                }
            });
            ctx.restore();
        }
    };

    if (window.industryChartInstance) {
        window.industryChartInstance.destroy();
    }

    window.industryChartInstance = new Chart(ctx, {
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
                    title: { display: true, text: `Momentum (${days}-Tage Änderung)`, color: "#aaa" },
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
                            return ` ${p.label} [Sektor: ${p.sector}]: Score ${p.x > 0 ? "+" : ""}${p.x.toFixed(1)} | Momentum ${p.y > 0 ? "+" : ""}${p.y.toFixed(1)}`;
                        }
                    }
                }
            }
        },
        plugins: [quadrantPlugin, industryLabelsPlugin]
    });
}
