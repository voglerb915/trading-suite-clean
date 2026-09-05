import GlobalState from "../../../shared/state/globalState.js";
import { sectorClasses } from '../../../shared/logic/sectorClasses.js';

export async function renderStockQuadrant(days = 5) {
    const ctx = document.getElementById('stockQuadrantChart');
    if (!ctx) return;

    // Standard ist SP500, passend zu deinem Backend
    const activeIndex = GlobalState.get("activeIndex") || "SP500";

    try {
        const response = await fetch(`http://localhost:4000/api/market/stocks/momentum?index=${activeIndex}&days=${days}`);
        if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);

        const result = await response.json(); 

        // --- EXAKTES MAPPING AUF DEINE 5 FOKUS-PANEL UNIVERSEN ---
        const indexMap = {
            "SP500": "SP500", "S&P 500": "SP500", "^GSPC": "SP500",
            "NDX": "NDX",     "Nasdaq 100": "NDX", "^IXIC": "NDX",
            "DJI": "DJI",     "Dow Jones": "DJI",  "^DJI": "DJI",
            "RUT": "RUT",     "Russell 2000": "RUT", "^RUT": "RUT",
            "NONE": "NONE",   "Other Stocks": "NONE", "Other": "NONE"
        };
        
        const indexKey = indexMap[activeIndex] || indexMap[activeIndex?.toUpperCase()] || activeIndex || "SP500";
        const rawData = result[indexKey] || result.SP500;

        let stocksData = [];
        if (rawData && rawData.top) {
            stocksData = [...rawData.top, ...rawData.losers];
        } else if (Array.isArray(result)) {
            stocksData = result;
        }

        if (!Array.isArray(stocksData) || stocksData.length === 0) {
            console.warn("Keine Aktien-Historiodaten für Universum gefunden:", indexKey);
            return;
        }
        // --- ENDE MAPPING ---

        const activeSectors = GlobalState.get("activeSectors");
        const activeQuadrants = GlobalState.get("activeQuadrants");

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

        const defaultColor = "#4ea8de";
        const datasets = [];
        let allPoints = [];

        stocksData.forEach(stock => {
            if (stock.history && Array.isArray(stock.history)) {
                allPoints.push(...stock.history);
            }
        });

        if (allPoints.length === 0) {
            console.warn("Keine Aktien-Historiodaten für den Quadranten gefunden.");
            return;
        }

        const xValues = allPoints.map(p => p.x);
        const yValues = allPoints.map(p => p.y);

        const xMin = Math.min(Math.floor(Math.min(...xValues, 0) * 1.2), -10);
        const xMax = Math.max(Math.ceil(Math.max(...xValues, 0) * 1.2), 10);
        const yMin = Math.min(Math.floor(Math.min(...yValues, 0) * 1.2), -5);
        const yMax = Math.max(Math.ceil(Math.max(...yValues, 0) * 1.2), 5);

        stocksData.forEach(stock => {
            if (!stock.history || stock.history.length === 0) return;

            const cssClass = sectorClasses[stock.sector];
            const sectorTickerMap = {
                "sector-tech": "XLK", "sector-financial": "XLF", "sector-energy": "XLE",
                "sector-utilities": "XLU", "sector-industrials": "XLI", "sector-consumer-cyclical": "XLY",
                "sector-consumer-defensive": "XLP", "sector-healthcare": "XLV", "sector-basic-materials": "XLB",
                "sector-real-estate": "XLRE", "sector-communication": "XLC"
            };

            const xlTicker = sectorTickerMap[cssClass];
            if (activeSectors && activeSectors.size > 0 && xlTicker && !activeSectors.has(xlTicker)) return;

            const currentPoint = stock.history[stock.history.length - 1];
            let quadKey = "";
            if (currentPoint.x >= 0 && currentPoint.y >= 0) quadKey = "leading";
            else if (currentPoint.x < 0 && currentPoint.y >= 0) quadKey = "improving";
            else if (currentPoint.x < 0 && currentPoint.y < 0) quadKey = "lagging";
            else if (currentPoint.x >= 0 && currentPoint.y < 0) quadKey = "weakening";

            if (activeQuadrants && activeQuadrants.size > 0 && !activeQuadrants.has(quadKey)) return;

            const color = sectorHexColors[cssClass] || defaultColor;
            const ticker = stock.ticker.toUpperCase();

            datasets.push({
                type: 'line',
                label: `${ticker} Schweif`,
                data: stock.history,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 1.2,
                borderDash: [3, 3],
                pointRadius: 1.5,
                pointHoverRadius: 3,
                fill: false,
                tension: 0.2,
                order: 2
            });

            datasets.push({
                type: 'scatter',
                label: stock.name || ticker,
                data: [{
                    x: currentPoint.x,
                    y: currentPoint.y,
                    label: stock.company || stock.name,
                    sector: stock.sector,
                    ticker: ticker,
                    color: color,
                    date: currentPoint.date
                }],
                backgroundColor: color,
                pointRadius: 6,
                pointHoverRadius: 9,
                order: 1
            });
        });

        const quadrantPlugin = {
            id: 'stockQuadrantBackground',
            beforeDraw(chart) {
                const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
                if (!x || !y) return;
                const xMid = x.getPixelForValue(0);
                const yMid = y.getPixelForValue(0);
                ctx.save();
                ctx.fillStyle = 'rgba(40, 167, 69, 0.2)'; ctx.fillRect(xMid, top, right - xMid, yMid - top);
                ctx.fillStyle = 'rgba(0, 123, 255, 0.2)'; ctx.fillRect(left, top, xMid - left, yMid - top);
                ctx.fillStyle = 'rgba(220, 53, 69, 0.2)'; ctx.fillRect(left, yMid, xMid - left, bottom - yMid);
                ctx.fillStyle = 'rgba(255, 193, 7, 0.2)'; ctx.fillRect(xMid, yMid, right - xMid, bottom - yMid);
                ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.moveTo(xMid, top); ctx.lineTo(xMid, bottom); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(left, yMid); ctx.lineTo(right, yMid); ctx.stroke();
                ctx.restore();
            }
        };

        const stockLabelsPlugin = {
            id: 'stockLabels',
            afterDatasetsDraw(chart) {
                const { ctx, scales: { x, y } } = chart;
                if (!x || !y) return;
                ctx.save();
                ctx.font = '10px sans-serif'; ctx.fillStyle = '#ccc'; ctx.textBaseline = 'middle';
                chart.data.datasets.forEach((ds) => {
                    if (ds.type === 'scatter' && ds.data.length > 0) {
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
                    x: { type: 'linear', title: { display: true, text: 'Relative Stärke', color: '#aaa' }, min: xMin, max: xMax, grid: { color: '#222' }, ticks: { color: '#888' } },
                    y: { type: 'linear', title: { display: true, text: `Momentum (${days}-Tage)`, color: '#aaa' }, min: yMin, max: yMax, grid: { color: '#222' }, ticks: { color: '#888' } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        filter: (item) => item.dataset.type === 'scatter',
                        callbacks: {
                            label: (ctx) => ` ${ctx.raw.label} (${ctx.raw.ticker}) [${ctx.raw.sector}]: Score ${ctx.raw.x.toFixed(1)} | Mom ${ctx.raw.y.toFixed(1)}`
                        }
                    }
                }
            },
            plugins: [quadrantPlugin, stockLabelsPlugin]
        });

    } catch (err) {
        console.error("Fehler beim Laden der Aktien-Historie:", err);
    }
}