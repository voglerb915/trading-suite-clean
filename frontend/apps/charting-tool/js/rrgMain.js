import { fetchSectorMomentum, fetchIndustryMomentum, fetchStockMomentum } from './api/rrgApi.js';
import { processSectorMomentumData, processIndustryMomentumData, processStockMomentumData } from './logic/rrgLogic.js';
import { renderSectorFilterBar } from './filters/rrgSectorFilterRenderer.js';
import { renderIndexFilterBar } from './filters/indexFilterRenderer.js';
import { renderQuadrantFilterBar } from './filters/quadrantFilterRenderer.js'; // oder je nach exaktem Ordner
import { renderSectorChart } from './renderer/rrgSectorRenderer.js';
import { renderIndustryChart } from './renderer/rrgIndustryRenderer.js';
import { renderStockChart } from './renderer/rrgStockRenderer.js';
import GlobalState from "@shared/state/globalState.js";

export async function initRrgModule() {
    try {
        console.log("Initialisiere RRG Modul...");

        // 1. Initialisiere Filter-Leisten in den jeweiligen DOM-Containern
        // (Passe die Container-IDs an deine HTML-Struktur an)
        renderIndexFilterBar("index-filter-container", () => reloadCurrentChart());
        renderSectorFilterBar("sector-filter-container", () => reloadCurrentChart());
        renderQuadrantFilterBar("quadrant-filter-container", () => reloadCurrentChart());

        // 2. Erster initialer Datenabruf und Chart-Draw (z.B. Sektoren als Standard)
        await loadAndRenderSectors();

        console.log("RRG Modul erfolgreich gestartet.");
    } catch (error) {
        console.error("Fehler im RRG Orchestrator:", error);
    }
}

// Zentrale Funktion zum Neuladen je nach ausgewähltem Tab/Modus
async function reloadCurrentChart() {
    const days = 5;

    // --- SECTORS ---
    const ctxSec = document.getElementById("rrgCanvasSectors")?.getContext("2d");
    if (ctxSec) {
        const rawSec = await fetchSectorMomentum();
        const procSec = processSectorMomentumData(rawSec);
        renderSectorChart(ctxSec, procSec);
    }

    // --- INDUSTRIES ---
    const ctxInd = document.getElementById("rrgCanvasIndustries")?.getContext("2d");
    if (ctxInd) {
        const rawInd = await fetchIndustryMomentum(days);
        const procInd = processIndustryMomentumData(rawInd);
        renderIndustryChart(ctxInd, procInd, days);
    }

// --- STOCKS ---
const ctxStk = document.getElementById("rrgCanvasStocks")?.getContext("2d");
if (ctxStk) {

    // ⭐ Index-Filter aktivieren
    const activeIndex = GlobalState.get("activeIndex") || "SP500";

    // ⭐ Richtigen Index an API übergeben
    const rawStk = await fetchStockMomentum(activeIndex, days);

    // ⭐ Richtigen Index an die Logic übergeben
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