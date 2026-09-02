import GlobalState from "../../shared/state/globalState.js";
// Korrigierter Import: initRightChartsData statt initRightChartsDefault (ohne getActiveMetrics, da lokal definiert!)
import { handleIndustrySelection, initRightChartsData, handleSectorSelection } from './rightSideLogic.js';

let combinedChartInstance = null;
let rawScoresData = [];
let rawPerfData = [];

// Globaler Zustand für die Metriken (Standard: nur Score an)
let activeMetrics = {
    score: true,
    perf: false
};

export function initMetricToggles() {
    const btnScore = document.getElementById('btn-toggle-score');
    const btnPerf = document.getElementById('btn-toggle-perf');

    if (!btnScore || !btnPerf) return;

    // UI Initial synchronisieren
    updateToggleUI();

    btnScore.addEventListener('click', () => {
        activeMetrics.score = !activeMetrics.score;
        // Verhindern, dass beide aus sind (mindestens eine muss an bleiben)
        if (!activeMetrics.score && !activeMetrics.perf) activeMetrics.score = true;
        updateToggleUI();
        triggerGlobalRefresh();
    });

    btnPerf.addEventListener('click', () => {
        activeMetrics.perf = !activeMetrics.perf;
        if (!activeMetrics.score && !activeMetrics.perf) activeMetrics.perf = true;
        updateToggleUI();
        triggerGlobalRefresh();
    });
}

function updateToggleUI() {
    const btnScore = document.getElementById('btn-toggle-score');
    const btnPerf = document.getElementById('btn-toggle-perf');
    
    if (btnScore) btnScore.classList.toggle('active', activeMetrics.score);
    if (btnPerf) btnPerf.classList.toggle('active', activeMetrics.perf);
}

function triggerGlobalRefresh() {
    renderActiveCharts();
    
    // Holt die aktuelle Auswahl und stößt das Neu-Rendern der rechten Charts an
    const activeSectors = GlobalState.get("activeSectors");
    if (activeSectors && activeSectors.size === 1) {
        const activeTicker = Array.from(activeSectors)[0];
        const sectorName = getSectorNameFromTicker(activeTicker);
        if (sectorName) handleSectorSelection(sectorName, rawScoresData);
    }
}

// Getter, damit chartLogic / rightSideLogic wissen, was aktiv ist
export function getActiveMetrics() {
    return activeMetrics;
}

export async function initCharts() {
    try {
        const [scoresRes, indPerfRes, sectorScoresRes, sectorPerfRes] = await Promise.all([
            fetch('/api/charts/industry-scores').then(r => r.json()),
            fetch('/api/charts/industry-performance').then(r => r.json()),
            fetch('/api/charts/sector-scores').then(r => r.json()),
            fetch('/api/charts/sector-performance').then(r => r.json())
        ]);

        if (scoresRes.success) rawScoresData = scoresRes.data;
        if (indPerfRes.success) rawPerfData = indPerfRes.data;

        // Alle 4 Caches an die rechte Seitenlogik übergeben
        initRightChartsData(
            scoresRes.success ? scoresRes.data : [],
            sectorScoresRes.success ? sectorScoresRes.data : [],
            sectorPerfRes.success ? sectorPerfRes.data : [],
            indPerfRes.success ? indPerfRes.data : []
        );

        const sectorScoresData = sectorScoresRes.success ? sectorScoresRes.data : [];

        // Metrik-Toggles initialisieren
        initMetricToggles();

        renderActiveCharts();
        
        // Initial den stärksten Sektor ermitteln und laden
        if (rawScoresData.length > 0 && sectorScoresData.length > 0) {
            const latestDate = sectorScoresData.reduce((max, d) => d.anl_datum > max ? d.anl_datum : max, sectorScoresData[0].anl_datum);
            
            const latestSectors = sectorScoresData
                .filter(d => d.anl_datum.startsWith(latestDate.split('T')[0]))
                .sort((a, b) => (parseFloat(b.score) || parseFloat(b.performance) || 0) - (parseFloat(a.score) || parseFloat(a.performance) || 0));

            if (latestSectors.length > 0) {
                const topSectorName = latestSectors[0].sector;
                handleSectorSelection(topSectorName, rawScoresData);
            }
        }

    } catch (err) {
        console.error("Fehler beim Laden der Chart-Daten in chartLogic:", err);
    }
}

export function renderActiveCharts() {
    const activeSectors = GlobalState.get("activeSectors");
    const metrics = getActiveMetrics ? getActiveMetrics() : { score: true, perf: false };

    const latestScoresMap = new Map();
    rawScoresData.forEach(d => {
        // WICHTIG: Nur filtern, wenn Sektoren aktiv ausgewählt sind (size > 0 und size < 11)
        if (activeSectors && activeSectors.size > 0 && activeSectors.size < 11 && !isSektorActive(d.sector, activeSectors)) {
            return;
        }
        if (!latestScoresMap.has(d.industry) || new Date(d.anl_datum) > new Date(latestScoresMap.get(d.industry).anl_datum)) {
            latestScoresMap.set(d.industry, d);
        }
    });

    let latestScores = Array.from(latestScoresMap.values());
    latestScores.sort((a, b) => b.score - a.score);

    const latestPerfMap = new Map();
    rawPerfData.forEach(d => {
        if (!latestPerfMap.has(d.industry) || new Date(d.anl_datum) > new Date(latestPerfMap.get(d.industry).anl_datum)) {
            latestPerfMap.set(d.industry, d);
        }
    });

    // Performance-Werte synchronisieren
    const synchronizedPerf = latestScores.map(scoreItem => {
        const perfItem = latestPerfMap.get(scoreItem.industry);
        if (!perfItem) return 0;
        return parseFloat(perfItem.performance) || parseFloat(perfItem.perf_quart) || 0;
    });

    // Übergabe an das Kombi-Chart
    updateCombinedChart(latestScores, synchronizedPerf, metrics);

    // Sektor-Auswahl Logik (falls genau 1 Sektor aktiv)
    if (activeSectors && activeSectors.size === 1) {
        const activeTicker = Array.from(activeSectors)[0];
        const sectorName = getSectorNameFromTicker(activeTicker);
        if (sectorName) {
            handleSectorSelection(sectorName, rawScoresData);
        }
    }
}

function getSectorNameFromTicker(ticker) {
    const reverseMapping = {
        "XLK": "Technology",
        "XLF": "Financial",
        "XLE": "Energy",
        "XLU": "Utilities",
        "XLI": "Industrials",
        "XLY": "Consumer Cyclical",
        "XLP": "Consumer Defensive",
        "XLV": "Healthcare",
        "XLB": "Basic Materials",
        "XLRE": "Real Estate",
        "XLC": "Communication Services"
    };
    return reverseMapping[ticker];
}

function isSektorActive(sectorName, activeSet) {
    if (!sectorName) return false;
    const mapping = {
        "Technology": "XLK",
        "Financial": "XLF",
        "Financial Services": "XLF",
        "Energy": "XLE",
        "Utilities": "XLU",
        "Industrials": "XLI",
        "Consumer Cyclical": "XLY",
        "Consumer Defensive": "XLP",
        "Healthcare": "XLV",
        "Health Care": "XLV",
        "Basic Materials": "XLB",
        "Materials": "XLB",
        "Real Estate": "XLRE",
        "Communication Services": "XLC"
    };
    const ticker = mapping[sectorName.trim()];
    return ticker ? activeSet.has(ticker) : false;
}

function updateCombinedChart(scoreData, perfValues, metrics = { score: true, perf: false }) {
    const canvas = document.getElementById('combinedIndustryChart');
    if (!canvas) return;
    const wrapper = canvas.parentElement;

    const dynamicHeight = Math.max(600, scoreData.length * 25);
    canvas.style.height = `${dynamicHeight}px`;
    wrapper.style.overflowY = 'auto';

    const ctx = canvas.getContext('2d');
    const labels = scoreData.map(d => d.industry);
    const scores = scoreData.map(d => d.score);

    const minScore = Math.min(0, ...scores);
    const maxScore = Math.max(1, ...scores);
    const minPerf = Math.min(0, ...perfValues);
    const maxPerf = Math.max(1, ...perfValues);

    const negScoreSpan = Math.abs(minScore);
    const posScoreSpan = maxScore;
    const scoreRatio = negScoreSpan / (negScoreSpan + posScoreSpan);

    const negPerfSpan = Math.abs(minPerf);
    const posPerfSpan = maxPerf;
    const perfRatio = negPerfSpan / (negPerfSpan + posPerfSpan);

    const targetRatio = Math.max(scoreRatio, perfRatio, 0.15);

    const adjustedMinScore = - (targetRatio * posScoreSpan) / (1 - targetRatio);
    const adjustedMaxScore = maxScore * 1.05;

    const adjustedMinPerf = - (targetRatio * posPerfSpan) / (1 - targetRatio);
    const adjustedMaxPerf = maxPerf * 1.05;

    if (combinedChartInstance) combinedChartInstance.destroy();

    // Dynamische Datasets basierend auf den aktiven Metrik-Pillen zusammenbauen
    let datasets = [];

    if (metrics.perf) {
        datasets.push({
            type: 'bar',
            label: 'Performance 3M (%)',
            data: perfValues.map((val, index) => ({
                x: [0, val],
                y: index
            })),
            backgroundColor: perfValues.map(p => p >= 0 ? '#10b981' : '#ef4444'),
            barThickness: 4,
            xAxisID: 'x2',
            order: 1
        });
    }

    if (metrics.score) {
        datasets.push({
            type: 'bar',
            label: 'RS Score',
            data: scores,
            backgroundColor: '#f59e0b',
            borderRadius: 4,
            xAxisID: 'x',
            order: 2
        });
    }

    combinedChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements, chart) => {
                const activeElements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const industryName = chart.data.labels[index];
                    handleIndustrySelection(industryName);
                }
            },
            scales: {
                x: {
                    position: 'bottom',
                    display: metrics.score, // Nur anzeigen, wenn Score aktiv ist
                    min: adjustedMinScore,
                    max: adjustedMaxScore,
                    title: { display: true, text: 'RS Score (Ausgeglichene 0-Linie)', color: '#888' },
                    ticks: { color: '#888' },
                    grid: { 
                        color: function(context) {
                            return context.tick.value === 0 ? '#888' : '#222';
                        }
                    }
                },
                x2: {
                    position: 'top',
                    display: metrics.perf, // Nur anzeigen, wenn Perf aktiv ist
                    min: adjustedMinPerf,
                    max: adjustedMaxPerf,
                    title: { display: true, text: 'Performance 3M (%) [Exakt synchronisiert]', color: '#888' },
                    ticks: { 
                        color: '#888',
                        callback: function(value) { return value.toFixed(0) + '%'; }
                    },
                    grid: { 
                        drawOnChartArea: true, 
                        color: function(context) {
                            return context.tick.value === 0 ? '#888' : '#222';
                        }
                    }
                },
                y: {
                    position: 'left',
                    ticks: { 
                        color: '#888', 
                        font: { size: 11 },
                        align: 'center' 
                    },
                    grid: { color: '#222' }
                }
            }
        }
    });
}