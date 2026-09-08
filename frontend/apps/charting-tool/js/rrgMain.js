import { fetchSectorMomentum, fetchIndustryMomentum, fetchStockMomentum } from './api/rrgApi.js';
import { processSectorMomentumData, processIndustryMomentumData, processStockMomentumData } from './logic/rrgLogic.js';
import { renderSectorFilterBar } from './filters/rrgSectorFilterRenderer.js';
import { renderIndexFilterBar } from './filters/indexFilterRenderer.js';
import { renderQuadrantFilterBar } from './filters/quadrantFilterRenderer.js'; // oder je nach exaktem Ordner
import { renderSectorChart } from './renderer/rrgSectorRenderer.js';
import { renderIndustryChart } from './renderer/rrgIndustryRenderer.js';
import { renderStockChart } from './renderer/rrgStockRenderer.js';
import { sectorTickers } from "../../../shared/logic/sectorMapping.js";


import GlobalState from "@shared/state/globalState.js";

export async function initRrgModule() {
    try {
        console.log("Initialisiere RRG Modul...");

        renderIndexFilterBar("index-filter-container-rrg", () => reloadCurrentChart());
        renderSectorFilterBar("sector-filter-container-rrg", () => reloadCurrentChart());
        renderQuadrantFilterBar("quadrant-filter-container-rrg", () => reloadCurrentChart());

        // Prüfen, ob durch Tab 1 bereits ein Sektor gesetzt wurde
        const existingSector = GlobalState.get("activeSectors");
        if (existingSector && existingSector.size > 0) {
            const firstTicker = Array.from(existingSector)[0];
            // Falls nötig mappen oder direkt setzen
            GlobalState.set("rrgActiveSector", firstTicker);
        }

        await loadAndRenderSectors();

        console.log("RRG Modul erfolgreich gestartet.");
    } catch (error) {
        console.error("Fehler im RRG Orchestrator:", error);
    }
}

// Zentrale Funktion zum Neuladen je nach ausgewähltem Tab/Modus
// In reloadCurrentChart() den Sektor-Filter auslesen und anwenden:
async function reloadCurrentChart() {
    const days = 5;
    const activeSector = GlobalState.get("rrgActiveSector");
    console.log("RRG lädt Charts mit aktivem Sektor-Filter:", activeSector);

    // --- SECTORS ---
    const ctxSec = document.getElementById("rrgCanvasSectors")?.getContext("2d");
    if (ctxSec) {
        const rawSec = await fetchSectorMomentum();
        let procSec = processSectorMomentumData(rawSec);
        
        // Falls ein Sektor extern/global gefiltert wurde, hier anwenden
        if (activeSector && typeof procSec.filter === 'function') {
            procSec = procSec.filter(item => item.sector === activeSector);
        }
        
        renderSectorChart(ctxSec, procSec);
    }

    // --- INDUSTRIES ---
    const ctxInd = document.getElementById("rrgCanvasIndustries")?.getContext("2d");
    if (ctxInd) {
        const rawInd = await fetchIndustryMomentum(days);
        let procInd = processIndustryMomentumData(rawInd);

        if (activeSector && typeof procInd.filter === 'function') {
            procInd = procInd.filter(item => item.sector === activeSector);
        }

        renderIndustryChart(ctxInd, procInd, days);
    }

    // --- STOCKS ---
    const ctxStk = document.getElementById("rrgCanvasStocks")?.getContext("2d");
    if (ctxStk) {
        const activeIndex = GlobalState.get("activeIndex") || "SP500";
        const rawStk = await fetchStockMomentum(activeIndex, days);
        const procStk = processStockMomentumData(rawStk, activeIndex);
        renderStockChart(ctxStk, procStk, days);
    }
}



async function loadAndRenderSectors() {
    GlobalState.set("activeRrgView", "sectors");
    await reloadCurrentChart();
}

// Direkt beim Laden der Seite initialisieren
document.addEventListener('DOMContentLoaded', () => {
    initRrgModule();
});

// Exportiere diese Funktion, damit tabs.js sie aufrufen kann
export async function updateRrgFilterFromExternal(sectorName) {
    console.log("RRG Modul erhält externen Sektor-Filter:", sectorName);

    // 1. Sektor im State speichern
    GlobalState.set("rrgActiveSector", sectorName);

    // 2. Charts neu laden
    if (typeof reloadCurrentChart === "function") {
        await reloadCurrentChart();
    }

    // 3. ⭐ Pillen-UI aktualisieren, damit die richtige Pille aktiv wird
    // (Passe den Funktionsnamen an, falls deine Render-Funktion anders heißt)
    renderSectorFilterBar("sector-filter-container-rrg", () => reloadCurrentChart());
}