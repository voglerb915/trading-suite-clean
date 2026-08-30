import GlobalState from "../../shared/state/globalState.js";
import { handleSectorSelection, initRightChartsData } from './rightSideLogic.js';
import { renderCombinedChart } from './js/chartRenderer.js';

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
    
    // Rechte Seite bei Änderung aktualisieren, falls Sektor gefiltert
    const activeSectors = GlobalState.get("activeSectors");
    if (activeSectors && activeSectors.size === 1) {
        const activeTicker = Array.from(activeSectors)[0];
        const sectorName = getSectorNameFromTicker(activeTicker);
        if (sectorName) handleSectorSelection(sectorName, rawScoresData);
    }
}

// Getter, damit andere Module wissen, was aktiv ist
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

        // Caches an die rechte Seitenlogik übergeben
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
        } // <--- Diese Klammer hat gefehlt (schließt das 'if (rawScoresData...)')

    } catch (err) {
        console.error("Fehler beim Laden der Chart-Daten in chartLogic:", err);
    }
}
export function renderActiveCharts() {
    const activeSectors = GlobalState.get("activeSectors");
    const metrics = getActiveMetrics ? getActiveMetrics() : { score: true, perf: false };

    const latestScoresMap = new Map();
    rawScoresData.forEach(d => {
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

    // Übergabe an den separaten Renderer
    renderCombinedChart(latestScores, synchronizedPerf, metrics);

    // Sektor-Auswahl Logik (falls genau 1 Sektor aktiv)
    if (activeSectors && activeSectors.size === 1) {
        const activeTicker = Array.from(activeSectors)[0];
        const sectorName = getSectorNameFromTicker(activeTicker);
        if (sectorName) {
            handleSectorSelection(sectorName, rawScoresData);

            // 👉 Signal direkt an das Dashboard senden:
            window.parent.postMessage({
                type: "REQUEST",
                action: "SELECT_SECTOR",
                payload: { sectorName: sectorName }
            }, "*");
        }
    }
} // <--- Diese schließende Klammer hat gefehlt

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