import GlobalState from "../../../shared/state/globalState.js";
import { sectorClasses } from '../../../shared/logic/sectorColors.js';

export async function renderSectorQuadrant() {
    const ctx = document.getElementById('sectorQuadrantChart');
    if (!ctx) return;

    try {
        const response = await fetch(`http://localhost:4000/api/market/sectors/momentum`);
        if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
        
        const result = await response.json(); 
        const sectorsData = Array.isArray(result) ? result : (result.sectors || result.data || []);

        if (!Array.isArray(sectorsData) || sectorsData.length === 0) {
            console.warn("Keine Sektor-Daten für den Quadranten gefunden.");
            return;
        }

        const sectorHexColors = {
            "sector-tech": "#4A90E2",
            "sector-healthcare": "#D0021B",
            "sector-financial": "#7ED321",
            "sector-industrials": "#F5A623",
            "sector-consumer-cyclical": "#9013FE",
            "sector-consumer-defensive": "#F8E71C",
            "sector-energy": "#8B572A",
            "sector-basic-materials": "#50E3C2",
            "sector-utilities": "#9B9B9B",
            "sector-real-estate": "#FF6F61",
            "sector-communication": "#B565A7"
        };

        // Mapping Sektorname zu ETF-Ticker, falls im JSON kein Ticker steht
        const sectorTickerMap = {
            "Technology": "XLK",
            "Financials": "XLF",
            "Energy": "XLE",
            "Utilities": "XLU",
            "Industrials": "XLI",
            "Consumer Discretionary": "XLY",
            "Consumer Staples": "XLP",
            "Health Care": "XLV",
            "Basic Materials": "XLB",
            "Real Estate": "XLRE",
            "Communication Services": "XLC"
        };

        const defaultColor = "#4ea8de";
        const datasets = [];
        let allPoints = [];

        sectorsData.forEach(sector => {
            if (sector.history && Array.isArray(sector.history)) {
                allPoints.push(...sector.history);
            }
        });

        if (allPoints.length === 0) return;

        const xValues = allPoints.map(p => p.x);
        const yValues = allPoints.map(p => p.y);

        const xMin = Math.min(Math.floor(Math.min(...xValues, 0) * 1.2), -5);
        const xMax = Math.max(Math.ceil(Math.max(...xValues, 0) * 1.2), 5);
        const yMin = Math.min(Math.floor(Math.min(...yValues, 0) * 1.2), -3);
        const yMax = Math.max(Math.ceil(Math.max(...yValues, 0) * 1.2), 3);

        sectorsData.forEach(sector => {
            if (!sector.history || sector.history.length === 0) return;

            const sectorName = sector.sector || sector.name || "Unknown";
            const cssClass = sectorClasses[sectorName];
            const color = sectorHexColors[cssClass] || defaultColor;
            const currentPoint = sector.history[sector.history.length - 1];
            
            // Ticker ermitteln (entweder aus Objekt oder Fallback-Map)
            const ticker = (sector.ticker || sector.symbol || sectorTickerMap[sectorName] || sectorName.substring(0, 4)).toUpperCase();

            // Schweif (Linie)
            datasets.push({
                type: 'line',
                label: `${ticker} Schweif`,
                data: sector.history,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 1.5,
                borderDash: [3, 3],
                pointRadius: 2,
                fill: false,
                tension: 0.2,
                order: 2
            });

            // Aktueller Punkt (Scatter)
            datasets.push({
                type: 'scatter',
                label: sectorName,
                data: [{
                    x: currentPoint.x,
                    y: currentPoint.y,
                    ticker: ticker,
                    sector: sectorName
                }],
                backgroundColor: color,
                pointRadius: 7,
                pointHoverRadius: 10,
                order: 1
            });
        });

        // --- PLUGIN 1: Quadranten-Hintergrund ---
        const sectorQuadrantBackground = {
            id: 'sectorQuadrantBackground',
            beforeDraw(chart) {
                const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
                if (!x || !y) return;
                
                const xMid = x.getPixelForValue(0);
                const yMid = y.getPixelForValue(0);

                ctx.save();
                ctx.fillStyle = 'rgba(40, 167, 69, 0.20)'; ctx.fillRect(xMid, top, right - xMid, yMid - top);
                ctx.fillStyle = 'rgba(0, 123, 255, 0.20)'; ctx.fillRect(left, top, xMid - left, yMid - top);
                ctx.fillStyle = 'rgba(220, 53, 69, 0.20)'; ctx.fillRect(left, yMid, xMid - left, bottom - yMid);
                ctx.fillStyle = 'rgba(255, 193, 7, 0.20)'; ctx.fillRect(xMid, yMid, right - xMid, bottom - yMid);

                ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(xMid, top); ctx.lineTo(xMid, bottom);
                ctx.moveTo(left, yMid); ctx.lineTo(right, yMid);
                ctx.stroke();
                ctx.restore();
            }
        };

        // --- PLUGIN 2: Ticker-Labels direkt am Punkt ---
        const sectorLabelsPlugin = {
            id: 'sectorLabels',
            afterDatasetsDraw(chart) {
                const { ctx, scales: { x, y } } = chart;
                if (!x || !y) return;

                ctx.save();
                ctx.font = '11px sans-serif';
                ctx.fillStyle = '#ddd';
                ctx.textBaseline = 'middle';

                chart.data.datasets.forEach((dataset) => {
                    if (dataset.type === 'scatter' && dataset.data.length > 0) {
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
                    x: { type: 'linear', title: { display: true, text: 'Score (Relative Stärke)', color: '#aaa' }, min: xMin, max: xMax, grid: { color: '#222' }, ticks: { color: '#888' } },
                    y: { type: 'linear', title: { display: true, text: 'Momentum', color: '#aaa' }, min: yMin, max: yMax, grid: { color: '#222' }, ticks: { color: '#888' } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        filter: function(tooltipItem) {
                            return tooltipItem.dataset.type === 'scatter';
                        },
                        callbacks: {
                            label: function(context) {
                                const p = context.raw;
                                if (!p) return '';
                                return ` ${p.sector} (${p.ticker}): Score ${p.x > 0 ? '+' : ''}${p.x.toFixed(1)} | Momentum ${p.y > 0 ? '+' : ''}${p.y.toFixed(1)}`;
                            }
                        }
                    }
                }
            },
            plugins: [sectorQuadrantBackground, sectorLabelsPlugin]
        });

    } catch (err) {
        console.error("Fehler beim Laden des Sektor-Quadranten:", err);
    }
}