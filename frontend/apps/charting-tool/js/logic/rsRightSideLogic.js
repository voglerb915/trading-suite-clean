// js/rs/logic/rsRightSideLogic.js

import { getActiveMetrics } from './rsLogic.js';
import { updateRightCharts } from '../renderer/rsHistoryRenderer.js';
import { getSectorNameFromTicker } from './rsSectorMapping.js';

// Globale Caches
let cachedScores = { rawScores: [], sectorScores: [] };
let cachedPerf = { sectorPerf: [], industryPerf: [] };

let lastSelectedIndustry = null;

/**
 * Initialisiert die Caches für die rechte Seite.
 */
export function initRightChartsData(rawScores, sectorScores, sectorPerf, industryPerf) {
    cachedScores.rawScores = rawScores;
    cachedScores.sectorScores = sectorScores;
    cachedPerf.sectorPerf = sectorPerf;
    cachedPerf.industryPerf = industryPerf;

    // Automatisch stärkste Industrie auswählen (nur beim ersten Start)
    if (cachedScores.rawScores.length > 0 && !lastSelectedIndustry) {
        const strongest = [...cachedScores.rawScores]
            .sort((a, b) => (b.score || 0) - (a.score || 0))[0];

        if (strongest?.industry) {
            handleIndustrySelection(strongest.industry, false);
        }
    }
}

/**
 * Wird aufgerufen, wenn eine Industrie ausgewählt wird.
 */
export function handleIndustrySelection(industryName, isUserAction = false) {
    if (industryName) {
        lastSelectedIndustry = industryName;
    }
    const targetIndustry = lastSelectedIndustry;
    if (!targetIndustry) return;

    const rawScores = cachedScores.rawScores;
    const sectorScores = cachedScores.sectorScores;
    const sectorPerf = cachedPerf.sectorPerf;
    const industryPerf = cachedPerf.industryPerf;

    if (!rawScores || rawScores.length === 0) return;

    const formatDateKey = (dateStr) => dateStr?.split('T')[0] || '';

    // Sektorname der Industrie ermitteln
    const sectorName = rawScores.find(d => d.industry === targetIndustry)?.sector || "Unknown";

    // Dashboard informieren (nur bei echtem User-Klick)
    if (isUserAction) {
        try {
            window.parent.postMessage({
                type: "REQUEST",
                action: "SELECT_INDUSTRY",
                payload: { industryName: targetIndustry, sectorName }
            }, "*");
        } catch {}
    }

    // --- SEKTOR SCORE HISTORY ---
    const exactSectorMap = {};
    sectorScores
        .filter(d => d.sector === sectorName)
        .forEach(d => {
            const key = formatDateKey(d.anl_datum);
            exactSectorMap[key] = parseFloat(d.score) || 0;
        });

    // --- SEKTOR PERF HISTORY ---
    const exactSectorPerfMap = {};
    sectorPerf
        .filter(d => d.sector === sectorName)
        .forEach(d => {
            const key = formatDateKey(d.anl_datum);
            exactSectorPerfMap[key] = parseFloat(d.performance) || parseFloat(d.perf_quart) || 0;
        });

    const sectorDates = new Set([
        ...Object.keys(exactSectorMap),
        ...Object.keys(exactSectorPerfMap)
    ]);
    const sortedSectorDates = [...sectorDates].sort((a, b) => new Date(a) - new Date(b));

    const exactSectorHistory = sortedSectorDates.map(key => ({
        anl_datum: key,
        score: exactSectorMap[key] ?? null
    }));

    const exactSectorPerfHistory = sortedSectorDates.map(key => ({
        anl_datum: key,
        performance: exactSectorPerfMap[key] ?? null
    }));

    // --- INDUSTRIE SCORE + SMA21 ---
    const industryScoreMap = {};
    const industrySmaMap = {};

    rawScores
        .filter(d => d.industry === targetIndustry)
        .forEach(d => {
            const key = formatDateKey(d.anl_datum);
            industryScoreMap[key] = parseFloat(d.score) || 0;
            industrySmaMap[key] = d.sma21 != null ? parseFloat(d.sma21) : null;
        });

    // --- INDUSTRIE PERF ---
    const industryPerfMap = {};
    industryPerf
        .filter(d => d.industry === targetIndustry)
        .forEach(d => {
            const key = formatDateKey(d.anl_datum);
            industryPerfMap[key] = parseFloat(d.performance) || parseFloat(d.perf_quart) || 0;
        });

    const industryDates = new Set([
        ...Object.keys(industryScoreMap),
        ...Object.keys(industryPerfMap),
        ...Object.keys(industrySmaMap)
    ]);
    const sortedIndustryDates = [...industryDates].sort((a, b) => new Date(a) - new Date(b));

    const exactIndustryScoreHistory = sortedIndustryDates.map(key => ({
        anl_datum: key,
        score: industryScoreMap[key] ?? null
    }));

    const exactIndustryPerfHistory = sortedIndustryDates.map(key => ({
        anl_datum: key,
        performance: industryPerfMap[key] ?? null
    }));

    const exactIndustrySmaHistory = sortedIndustryDates.map(key => ({
        anl_datum: key,
        sma21: industrySmaMap[key] ?? null
    }));

    // Übergabe an den Renderer
// Übergabe an den Renderer (⭐ jetzt dynamisch)
updateRightCharts(
    exactSectorHistory,
    exactSectorPerfHistory,
    exactIndustryScoreHistory,
    exactIndustryPerfHistory,
    targetIndustry,
    exactIndustrySmaHistory,
    sectorName   // ⭐ dynamischer Titel für beide History-Charts
);

}

/**
 * Wird aufgerufen, wenn ein Sektor ausgewählt wird.
 */
export function handleSectorSelection(sectorName, rawData) {
    const dataToUse = rawData?.length ? rawData : cachedScores.rawScores;
    if (!dataToUse?.length) return;

    const sectorItems = dataToUse.filter(d => d.sector === sectorName);
    if (!sectorItems.length) return;

    const latestByIndustry = new Map();
    sectorItems.forEach(d => {
        const existing = latestByIndustry.get(d.industry);
        if (!existing || new Date(d.anl_datum) > new Date(existing.anl_datum)) {
            latestByIndustry.set(d.industry, d);
        }
    });

    const uniqueIndustries = [...latestByIndustry.values()]
        .sort((a, b) => (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0));

    if (uniqueIndustries.length > 0) {
        handleIndustrySelection(uniqueIndustries[0].industry);
    }
}
export function refreshRightSide() {
    if (!lastSelectedIndustry) return;

    handleIndustrySelection(lastSelectedIndustry, false);
}

