import GlobalState from "../../../shared/state/globalState.js";
import { sectorClasses } from '../../../shared/logic/sectorColors.js';

export async function renderIndustryQuadrant(days = 5) {
    const ctx = document.getElementById('industryQuadrantChart');
    if (!ctx) return;

    try {
        const response = await fetch(`http://localhost:4000/api/market/industries/momentum?days=${days}`);
        if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
        
        const industriesData = await response.json(); 

        // Aktive Filter aus dem GlobalState auslesen
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
        const sectorTickerMap = {
            "sector-tech": "XLK",
            "sector-financial": "XLF",
            "sector-energy": "XLE",
            "sector-utilities": "XLU",
            "sector-industrials": "XLI",
            "sector-consumer-cyclical": "XLY",
            "sector-consumer-defensive": "XLP",
            "sector-healthcare": "XLV",
            "sector-basic-materials": "XLB",
            "sector-real-estate": "XLRE",
            "sector-communication": "XLC"
        };

        // --- 1. SCHRITT: FILTERUNG VORAB ANWENDEN ---
        // Damit berechnen wir die Achsen später nur für die Elemente, die auch wirklich im Chart landen.
        const filteredIndustries = industriesData.filter(ind => {
            if (!ind.history || ind.history.length === 0) return false;

            const cssClass = sectorClasses[ind.sector];
            const xlTicker = sectorTickerMap[cssClass];

            // Sektor-Filter prüfen
            if (activeSectors && activeSectors.size > 0 && xlTicker && !activeSectors.has(xlTicker)) {
                return false;
            }

            // Quadranten-Filter prüfen (anhand des neuesten/letzten Punktes im History-Array)
            const currentPoint = ind.history[ind.history.length - 1];
            let quadKey = "";
            if (currentPoint.x >= 0 && currentPoint.y >= 0) quadKey = "leading";
            else if (currentPoint.x < 0 && currentPoint.y >= 0) quadKey = "improving";
            else if (currentPoint.x < 0 && currentPoint.y < 0) quadKey = "lagging";
            else if (currentPoint.x >= 0 && currentPoint.y < 0) quadKey = "weakening";

            if (activeQuadrants && activeQuadrants.size > 0 && !activeQuadrants.has(quadKey)) {
                return false;
            }

            return true;
        });

        if (filteredIndustries.length === 0) {
            console.warn("Keine Industrie-Historiodaten nach Filterung gefunden.");
            // Optional: Alten Chart zerstören oder leeren, falls vorhanden
            if (window.industryChartInstance) window.industryChartInstance.destroy();
            return;
        }

        // --- 2. SCHRITT: PUNKTE NUR AUS GEFILTERTEN DATEN EINSAMMELN ---
        let allPoints = [];
        filteredIndustries.forEach(ind => {
            allPoints.push(...ind.history);
        });

        // --- 3. SCHRITT: DYNAMISCHE ACHSEN-SKALIERUNG ---
        const xValues = allPoints.map(p => p.x);
        const yValues = allPoints.map(p => p.y);

        const minXData = Math.min(...xValues, 0);
        const maxXData = Math.max(...xValues, 0);
        const minYData = Math.min(...yValues, 0);
        const maxYData = Math.max(...yValues, 0);

        // Dynamischer Puffer, der sich an den verbleibenden Daten orientiert, 
        // aber einen Mindestabstand (z.B. -10/-5) wahrt, damit es nicht zu gequetscht wirkt.
        const xMin = Math.min(Math.floor(minXData * 1.2), -5);
        const xMax = Math.max(Math.ceil(maxXData * 1.2), 5);
        const yMin = Math.min(Math.floor(minYData * 1.2), -3);
        const yMax = Math.max(Math.ceil(maxYData * 1.2), 3);

        const xCenter = 0; 
        const yCenter = 0;

        // --- 4. SCHRITT: DATASETS AUFBAUEN ---
        const datasets = [];

        filteredIndustries.forEach(ind => {
            const cssClass = sectorClasses[ind.sector];
            const color = sectorHexColors[cssClass] || defaultColor;
            const currentPoint = ind.history[ind.history.length - 1];
            
            const labelText = ind.industry;
            const ticker = labelText.length > 8 ? labelText.substring(0, 6).toUpperCase() + '.' : labelText.toUpperCase();

            // Dataset 1: Der Schweif (Linie)
            datasets.push({
                type: 'line',
                label: `${labelText} Schweif`,
                data: ind.history,
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

            // Dataset 2: Der aktuelle Kopf (Scatter-Punkt ganz vorne)
            datasets.push({
                type: 'scatter',
                label: labelText,
                data: [{
                    x: currentPoint.x,
                    y: currentPoint.y,
                    label: labelText,
                    sector: ind.sector,
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

        // --- PLUGIN 1: Quadranten-Hintergrund ---
        const quadrantPlugin = {
            id: 'industryQuadrantBackground',
            beforeDraw(chart) {
                const { ctx, chartArea: { left, top, right, bottom }, scales: { x, y } } = chart;
                if (!x || !y) return;
                
                const xMid = x.getPixelForValue(xCenter);
                const yMid = y.getPixelForValue(yCenter);

                ctx.save();
                
                // 1. Leading (Grün)
                ctx.fillStyle = 'rgba(40, 167, 69, 0.30)';
                ctx.fillRect(xMid, top, right - xMid, yMid - top);

                // 2. Improving (Blau)
                ctx.fillStyle = 'rgba(0, 123, 255, 0.30)';
                ctx.fillRect(left, top, xMid - left, yMid - top);

                // 3. Lagging (Rot)
                ctx.fillStyle = 'rgba(220, 53, 69, 0.30)';
                ctx.fillRect(left, yMid, xMid - left, bottom - yMid);

                // 4. Weakening (Gelb)
                ctx.fillStyle = 'rgba(255, 193, 7, 0.30)';
                ctx.fillRect(xMid, yMid, right - xMid, bottom - yMid);

                ctx.strokeStyle = '#555';
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

        // --- PLUGIN 2: Label-Anzeige für Industrien ---
        const industryLabelsPlugin = {
            id: 'industryLabels',
            afterDatasetsDraw(chart) {
                const { ctx, scales: { x, y } } = chart;
                if (!x || !y) return;

                ctx.save();
                ctx.font = '10px sans-serif';
                ctx.fillStyle = '#ccc';
                ctx.textBaseline = 'middle';

                chart.data.datasets.forEach((dataset) => {
                    if (dataset.type === 'scatter' && dataset.data.length > 0) {
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
                        type: 'linear',
                        title: { display: true, text: 'Score (Relative Stärke)', color: '#aaa' },
                        min: xMin,
                        max: xMax,
                        grid: { color: '#222' },
                        ticks: { color: '#888' }
                    },
                    y: {
                        type: 'linear',
                        title: { display: true, text: `Momentum (${days}-Tage Änderung)`, color: '#aaa' },
                        min: yMin,
                        max: yMax,
                        grid: { color: '#222' },
                        ticks: { color: '#888' }
                    }
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
                                return ` ${p.label} [Sektor: ${p.sector}]: Score ${p.x > 0 ? '+' : ''}${p.x.toFixed(1)} | Momentum ${p.y > 0 ? '+' : ''}${p.y.toFixed(1)}`;
                            }
                        }
                    }
                }
            },
            plugins: [quadrantPlugin, industryLabelsPlugin]
        });

    } catch (err) {
        console.error("Fehler beim Laden der Industrie-Historie für den Chart:", err);
    }
}