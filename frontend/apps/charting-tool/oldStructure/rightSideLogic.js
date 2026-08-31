// Oben in deiner rightSideLogic.js importieren:
import { getActiveMetrics } from './chartLogic.js';

// Globale Caches für beide Modi
let cachedScores = { rawScores: [], sectorScores: [] };
let cachedPerf = { sectorPerf: [], industryPerf: [] };

// Chart-Instanzen für Sektor und Industrie
let sectorHistoryInstance = null;
let industryHistoryInstance = null;
let lastSelectedIndustry = null;

export function initRightChartsData(rawScores, sectorScores, sectorPerf, industryPerf) {
    cachedScores.rawScores = rawScores;
    cachedScores.sectorScores = sectorScores;
    cachedPerf.sectorPerf = sectorPerf;
    cachedPerf.industryPerf = industryPerf;

    if (cachedScores.rawScores.length > 0 && !lastSelectedIndustry) {
        const strongest = [...cachedScores.rawScores].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
        if (strongest?.industry) {
            handleIndustrySelection(strongest.industry, false);
        }
    }
}

export function handleIndustrySelection(industryName, isUserAction = false) {
    if (industryName) {
        lastSelectedIndustry = industryName;
    }
    const targetIndustry = lastSelectedIndustry;
    if (!targetIndustry) return;

    const formatDateKey = (dateStr) => {
        if (!dateStr) return '';
        return dateStr.split('T')[0];
    };

    const rawScores = cachedScores.rawScores;
    const sectorScores = cachedScores.sectorScores;
    const sectorPerf = cachedPerf.sectorPerf;
    const industryPerf = cachedPerf.industryPerf;

    if (!rawScores || rawScores.length === 0) return;

    // 👉 Hier wird the Sektor ermittelt:
    const sectorName = rawScores.find(d => d.industry === targetIndustry)?.sector || "Unknown";

    // 👉 NUR bei echtem User-Klick senden wir BEIDES (Industrie + Sektor) an das Dashboard!
    if (isUserAction) {
        window.parent.postMessage({
            type: "REQUEST",
            action: "SELECT_INDUSTRY",
            payload: { 
                industryName: targetIndustry,
                sectorName: sectorName 
            }
        }, "*");
    }

    // --- 1. SEKTOR DATEN AUFBEREITEN ---
    const exactSectorMap = {};
    sectorScores
        .filter(d => d.sector === sectorName)
        .forEach(d => {
            const dateKey = formatDateKey(d.anl_datum);
            exactSectorMap[dateKey] = parseFloat(d.score) || 0;
        });

    const exactSectorPerfMap = {};
    sectorPerf
        .filter(d => d.sector === sectorName)
        .forEach(d => {
            const dateKey = formatDateKey(d.anl_datum);
            exactSectorPerfMap[dateKey] = parseFloat(d.performance) || parseFloat(d.perf_quart) || 0;
        });

    const sectorDatesSet = new Set([...Object.keys(exactSectorMap), ...Object.keys(exactSectorPerfMap)]);
    const sortedSectorDates = Array.from(sectorDatesSet).sort((a, b) => new Date(a) - new Date(b));

    const exactSectorHistory = sortedSectorDates.map(dateKey => ({
        anl_datum: dateKey,
        score: exactSectorMap[dateKey] !== undefined ? exactSectorMap[dateKey] : null
    }));

    const exactSectorPerfHistory = sortedSectorDates.map(dateKey => ({
        anl_datum: dateKey,
        performance: exactSectorPerfMap[dateKey] !== undefined ? exactSectorPerfMap[dateKey] : null
    }));

    // --- 2. INDUSTRIE DATEN AUFBEREITEN (inkl. SMA21) ---
    const industryScoreMap = {};
    const industrySmaMap = {};

    rawScores
        .filter(d => d.industry === targetIndustry)
        .forEach(d => {
            const dateKey = formatDateKey(d.anl_datum);
            industryScoreMap[dateKey] = parseFloat(d.score) || 0;
            industrySmaMap[dateKey] = d.sma21 != null ? parseFloat(d.sma21) : null;
        });

    const industryPerfMap = {};
    industryPerf
        .filter(d => d.industry === targetIndustry)
        .forEach(d => {
            const dateKey = formatDateKey(d.anl_datum);
            industryPerfMap[dateKey] = parseFloat(d.performance) || parseFloat(d.perf_quart) || 0;
        });

    const industryDatesSet = new Set([
        ...Object.keys(industryScoreMap), 
        ...Object.keys(industryPerfMap), 
        ...Object.keys(industrySmaMap)
    ]);
    const sortedIndustryDates = Array.from(industryDatesSet).sort((a, b) => new Date(a) - new Date(b));

    const exactIndustryScoreHistory = sortedIndustryDates.map(dateKey => ({
        anl_datum: dateKey,
        score: industryScoreMap[dateKey] !== undefined ? industryScoreMap[dateKey] : null
    }));

    const exactIndustryPerfHistory = sortedIndustryDates.map(dateKey => ({
        anl_datum: dateKey,
        performance: industryPerfMap[dateKey] !== undefined ? industryPerfMap[dateKey] : null
    }));

    const exactIndustrySmaHistory = sortedIndustryDates.map(dateKey => ({
        anl_datum: dateKey,
        sma21: industrySmaMap[dateKey] !== undefined ? industrySmaMap[dateKey] : null
    }));

    // --- TITEL AKTUALISIEREN ---
    const sectorTitleEl = document.getElementById('sector-history-title');
    if (sectorTitleEl) sectorTitleEl.innerText = `Sektor-Verlauf: ${sectorName} (RS Score & Performance)`;

    const industryTitleEl = document.getElementById('industry-history-title');
    if (industryTitleEl) industryTitleEl.innerText = `Industrie-Verlauf: ${targetIndustry} (RS Score & Performance)`;

    updateRightCharts(
        exactSectorHistory, 
        exactSectorPerfHistory, 
        exactIndustryScoreHistory, 
        exactIndustryPerfHistory, 
        targetIndustry,
        exactIndustrySmaHistory
    );
}

export function handleSectorSelection(sectorName, rawData) {
    const dataToUse = rawData && rawData.length > 0 ? rawData : cachedScores.rawScores;
    if (!dataToUse || dataToUse.length === 0) return;

    const sectorItems = dataToUse.filter(d => d.sector === sectorName);
    if (sectorItems.length === 0) return;

    const latestByIndustry = new Map();
    sectorItems.forEach(d => {
        const existing = latestByIndustry.get(d.industry);
        if (!existing || new Date(d.anl_datum) > new Date(existing.anl_datum)) {
            latestByIndustry.set(d.industry, d);
        }
    });

    const uniqueIndustries = Array.from(latestByIndustry.values());
    uniqueIndustries.sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0));

    if (uniqueIndustries.length > 0) {
        handleIndustrySelection(uniqueIndustries[0].industry);
    }
}


export function updateRightCharts(sectorScoreData, sectorPerfData, industryScoreData, industryPerfData, targetIndustry, industrySmaData = []) {
    const sectorCtx = document.getElementById('sectorHistoryChart').getContext('2d');
    const industryCtx = document.getElementById('industryHistoryChart').getContext('2d');

    if (sectorHistoryInstance) sectorHistoryInstance.destroy();
    if (industryHistoryInstance) industryHistoryInstance.destroy();

    // Aktuellen Metrik-Zustand (Score / Perf) von links abrufen
    const metrics = getActiveMetrics ? getActiveMetrics() : { score: true, perf: false };

    const sharedLegendConfig = {
        labels: { color: '#fff', boxWidth: 12 },
        onClick: function(e, legendItem, legend) {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            if (ci.isDatasetVisible(index)) ci.hide(index);
            else ci.show(index);
        }
    };

    const zeroLineGridConfig = {
        color: function(context) {
            return context.tick.value === 0 ? '#888' : '#222';
        }
    };

    // --- CUSTOM PLUGIN: Horizontale Linie vom letzten Datenpunkt (für Industrie-Chart) ---
    const lastValueHorizontalLinePlugin = {
        id: 'lastValueHorizontalLine',
        afterDraw(chart) {
            const scoreDatasetIndex = chart.data.datasets.findIndex(d => d.yAxisID === 'y' && d.data && d.data.length > 0);
            if (scoreDatasetIndex === -1) return;

            const dataset = chart.data.datasets[scoreDatasetIndex];
            // Finde den letzten gültigen (nicht-null) Wert im Daten-Array
            let lastVal = null;
            for (let i = dataset.data.length - 1; i >= 0; i--) {
                if (dataset.data[i] !== null && dataset.data[i] !== undefined) {
                    lastVal = dataset.data[i];
                    break;
                }
            }

            if (lastVal === null) return;

            const { ctx, chartArea: { left, right }, scales } = chart;
            const yScale = scales.y;
            if (!yScale) return;

            const yPixel = yScale.getPixelForValue(lastVal);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(left, yPixel);
            ctx.lineTo(right, yPixel);
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(147, 51, 234, 0.5)'; // Dunkles Lila, dezent transparent
            ctx.setLineDash([3, 3]); // Dünn gestrichelt
            ctx.stroke();
            ctx.restore();
        }
    };

    // --- SEKTOR-CHART ---
    let sectorDatasets = [];
    if (metrics.score) {
        sectorDatasets.push({
            label: 'RS Score',
            data: sectorScoreData.map(d => d.score),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            yAxisID: 'y'
        });
    }
    if (metrics.perf) {
        sectorDatasets.push({
            label: 'Performance 3M (%)',
            data: sectorPerfData.map(d => d.performance),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            yAxisID: 'y2'
        });
    }

    sectorHistoryInstance = new Chart(sectorCtx, {
        type: 'line',
        data: {
            labels: sectorScoreData.map(d => d.anl_datum),
            datasets: sectorDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: '#222' } },
                y: { 
                    type: 'linear', display: metrics.score, position: 'left',
                    ticks: { color: '#f59e0b' }, 
                    grid: zeroLineGridConfig,
                    title: { display: true, text: 'RS Score', color: '#f59e0b' }
                },
                y2: {
                    type: 'linear', display: metrics.perf, position: 'right',
                    ticks: { color: '#10b981', callback: (val) => val.toFixed(0) + '%' },
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Performance 3M', color: '#10b981' }
                }
            },
            plugins: { legend: sharedLegendConfig }
        }
    });

    // --- INDUSTRIE-CHART ---
    let industryDatasets = [];
    if (metrics.score) {
        industryDatasets.push({
            label: `RS Score (${targetIndustry})`,
            data: industryScoreData.map(d => d.score),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.1,
            yAxisID: 'y'
        });

        // SMA21 in dunklem Lila als zusätzliche gestrichelte Linie
        if (industrySmaData && industrySmaData.length > 0) {
            industryDatasets.push({
                label: `SMA 21 (${targetIndustry})`,
                data: industrySmaData.map(d => d.sma21),
                borderColor: '#9333ea', // Dunkles Lila
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderDash: [4, 4], 
                fill: false,
                tension: 0.1,
                yAxisID: 'y'
            });
        }
    }
    if (metrics.perf) {
        industryDatasets.push({
            label: `Performance 3M (%) (${targetIndustry})`,
            data: industryPerfData.map(d => d.performance),
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.05)',
            borderWidth: 2,
            fill: false,
            tension: 0.1,
            yAxisID: 'y2'
        });
    }

    industryHistoryInstance = new Chart(industryCtx, {
        type: 'line',
        data: {
            labels: industryScoreData.map(d => d.anl_datum),
            datasets: industryDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: '#222' } },
                y: { 
                    type: 'linear', display: metrics.score, position: 'left',
                    ticks: { color: '#3b82f6' }, 
                    grid: zeroLineGridConfig,
                    title: { display: true, text: 'RS Score & SMA', color: '#3b82f6' }
                },
                y2: {
                    type: 'linear', display: metrics.perf, position: 'right',
                    ticks: { color: '#ec4899', callback: (val) => val.toFixed(0) + '%' },
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Performance 3M', color: '#ec4899' }
                }
            },
            plugins: { legend: sharedLegendConfig }
        },
        plugins: [lastValueHorizontalLinePlugin] // Plugin an den Industrie-Chart gebunden
    });
}