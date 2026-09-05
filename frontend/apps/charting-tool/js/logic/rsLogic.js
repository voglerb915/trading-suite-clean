// js/rs/logic/rsLogic.js

import GlobalState from "@shared/state/globalState.js";
import { fetchAllRsData } from "../api/rsApi.js";
import { getSectorNameFromTicker, isSectorActive } from "./rsSectorMapping.js";
import { initRightChartsData, handleSectorSelection, refreshRightSide } from "./rsRightSideLogic.js";
import { renderCombinedChart } from "../renderer/rsMasterRenderer.js";
import { onIndustryClick } from "./rsMasterClickHandler.js";

// Lokale Caches
let rawScoresData = [];
let rawPerfData = [];

// Globale Metriken (Score/Perf)
let activeMetrics = {
    score: true,
    perf: false
};

/**
 * Getter für andere Module
 */
export function getActiveMetrics() {
    return activeMetrics;
}

/**
 * Initialisiert die Score/Perf-Pillen (nur Logik, kein DOM)
 */
export function initMetricToggles() {
const btnScore = document.getElementById('rs-toggle-score');
const btnPerf = document.getElementById('rs-toggle-perf');


    if (!btnScore || !btnPerf) return;

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

/**
 * UI aktualisieren (nur CSS-Klassen)
 */
function updateToggleUI() {
    const btnScore = document.getElementById('rs-toggle-score');
    const btnPerf = document.getElementById('rs-toggle-perf');


    if (btnScore) btnScore.classList.toggle('active', activeMetrics.score);
    if (btnPerf) btnPerf.classList.toggle('active', activeMetrics.perf);
}

/**
 * Wird aufgerufen, wenn Score/Perf geändert wird
 */
function triggerGlobalRefresh() {
    renderActiveCharts();

    refreshRightSide();   // ⭐ Right-Side immer neu zeichnen

    const activeSectors = GlobalState.get("activeSectors");
    if (activeSectors && activeSectors.size === 1) {
        const activeTicker = Array.from(activeSectors)[0];
        const sectorName = getSectorNameFromTicker(activeTicker);
        if (sectorName) handleSectorSelection(sectorName, rawScoresData);
    }
}



/**
 * Initialisiert alle RS-Daten
 */
export async function initCharts() {
    try {
        const {
            industryScores,
            industryPerf,
            sectorScores,
            sectorPerf
        } = await fetchAllRsData();

        rawScoresData = industryScores || [];
        rawPerfData = industryPerf || [];

        // Right-Side-Logik initialisieren
        initRightChartsData(
            industryScores || [],
            sectorScores || [],
            sectorPerf || [],
            industryPerf || []
        );

        // Metric-Pillen aktivieren
        initMetricToggles();

        // Charts rendern
        renderActiveCharts();

        // Stärksten Sektor initial auswählen
        if (rawScoresData.length > 0 && sectorScores.length > 0) {
            const latestDate = sectorScores.reduce(
                (max, d) => d.anl_datum > max ? d.anl_datum : max,
                sectorScores[0].anl_datum
            );

            const latestSectors = sectorScores
                .filter(d => d.anl_datum.startsWith(latestDate.split('T')[0]))
                .sort((a, b) =>
                    (parseFloat(b.score) || parseFloat(b.performance) || 0) -
                    (parseFloat(a.score) || parseFloat(a.performance) || 0)
                );

            if (latestSectors.length > 0) {
                const topSectorName = latestSectors[0].sector;
                handleSectorSelection(topSectorName, rawScoresData);
            }
        }

    } catch (err) {
        console.error("Fehler beim Laden der RS-Daten:", err);
    }
}

/**
 * Rendert den CombinedChart basierend auf aktiven Sektoren
 */

    // ⭐ Überschrift dynamisieren
export function renderActiveCharts() {

    let activeSectors = GlobalState.get("activeSectors");
    const metrics = getActiveMetrics();

    // ⭐ Set bereinigen
    if (activeSectors) {
        activeSectors = new Set([...activeSectors].filter(x => typeof x === "string"));
    }

    // ⭐ Aktiven Sektor bestimmen (falls genau einer aktiv)
    let sectorName = null;
    if (activeSectors && activeSectors.size === 1) {
        const activeTicker = Array.from(activeSectors)[0];
        sectorName = getSectorNameFromTicker(activeTicker);
    }

    console.log("Active sectors (cleaned):", activeSectors);
    console.log("sectorName:", sectorName);

    // --- Scores: nur die neuesten pro Industrie ---
    const latestScoresMap = new Map();
    rawScoresData.forEach(d => {
        if (activeSectors && activeSectors.size > 0 && activeSectors.size < 11) {
            if (!isSectorActive(d.sector, activeSectors)) return;
        }
        if (
            !latestScoresMap.has(d.industry) ||
            new Date(d.anl_datum) > new Date(latestScoresMap.get(d.industry).anl_datum)
        ) {
            latestScoresMap.set(d.industry, d);
        }
    });

    let latestScores = Array.from(latestScoresMap.values());
    latestScores.sort((a, b) => b.score - a.score);

    // --- Performance synchronisieren ---
    const latestPerfMap = new Map();
    rawPerfData.forEach(d => {
        if (
            !latestPerfMap.has(d.industry) ||
            new Date(d.anl_datum) > new Date(latestPerfMap.get(d.industry).anl_datum)
        ) {
            latestPerfMap.set(d.industry, d);
        }
    });

    const synchronizedPerf = latestScores.map(scoreItem => {
        const perfItem = latestPerfMap.get(scoreItem.industry);
        if (!perfItem) return 0;
        return parseFloat(perfItem.performance) || parseFloat(perfItem.perf_quart) || 0;
    });

    // --- CombinedChart rendern ---
    renderCombinedChart(
        latestScores,
        synchronizedPerf,
        metrics,
        onIndustryClick,
        sectorName
    );

    // --- Falls genau 1 Sektor aktiv ist → Industrie auswählen ---
    if (sectorName) {
        handleSectorSelection(sectorName, rawScoresData);
    }
}




