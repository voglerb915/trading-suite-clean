// /apps/lab/js/mainFalseBo.js
import { fetchFalseBoData } from './api/api-falseBo.js';
// Falls du Berechnungen oder Filter brauchst, importierst du sie hier aus dem logic/-Ordner:
// import { processFalseBoData } from './logic/logic-falseBo.js';
import { renderStrategyList } from './renderer/render-falseBo.js';

/**
 * Startet den Workflow für das False Breakout Setup
 * @param {string} containerId - Die Ziel-ID im DOM (Standard: 'col-3')
 */
export async function initFalseBo(containerId = 'col-3') {
    try {
        // 1. Daten über das API-Modul abrufen
        const rawData = await fetchFalseBoData();

        // 2. Optional: Logik/Filter anwenden (falls nötig)
        // const processedData = processFalseBoData(rawData);
        const processedData = rawData; // vorerst direkt durchgereicht

        // 3. Daten über das Renderer-Modul in den DOM schreiben
        renderStrategyList(processedData, containerId);

    } catch (error) {
        console.error("FEHLER IN mainFalseBo Orchestrator:", error);
    }
}