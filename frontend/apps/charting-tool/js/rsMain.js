import GlobalState from "@shared/state/globalState.js";
import { initCharts } from "./logic/rsLogic.js";
import { renderSectorPills } from "./renderer/sectorPillsRenderer.js";
import { getTickerFromSectorName } from "./logic/rsSectorMapping.js";

// Export für den externen Aufruf aus der tabs.js
export async function updateRsFilterFromExternal(sectorName) {
    console.log("RS-Modul erhält externen Sektor:", sectorName);

    const ticker = getTickerFromSectorName(sectorName);
    
    // GUARD: Prüfen, ob der Sektor bereits exakt aktiv ist und keine Industrie das Bild verzerrt
    let active = GlobalState.get("activeSectors");
    const currentIndustry = GlobalState.get("activeIndustry");
    const currentTicker = active ? Array.from(active)[0] : null;

    // Wenn der Ticker identisch ist und keine Industrie aktiv war (oder zurückgesetzt wurde)
    if (currentTicker === ticker && !currentIndustry) {
        return; // Stoppt das Echo-Rendering
    }

    if (!active) active = new Set();
    active.clear();
    if (ticker) active.add(ticker);
    GlobalState.set("activeSectors", active);
    
    // Industrie zurücksetzen, da reiner Sektor gewählt wurde
    GlobalState.set("activeIndustry", null);

    // Sektor-Pills UI aktualisieren
    renderSectorPills("rs-sector-filter", async (sector) => {
        const currentActive = GlobalState.get("activeSectors");
        if (currentActive.has(sector)) currentActive.delete(sector);
        else currentActive.add(sector);
        GlobalState.set("activeSectors", currentActive);

        const { renderActiveCharts } = await import("./logic/rsLogic.js");
        renderActiveCharts();
    });

    // Charts neu rendern
    const { renderActiveCharts } = await import("./logic/rsLogic.js");
    if (typeof renderActiveCharts === 'function') {
        renderActiveCharts();
    } else {
        await initCharts();
    }
}

// Export für den externen Industrie-Aufruf aus der tabs.js
export async function updateRsIndustryFilterFromExternal(sectorName, industryName) {
    // GUARD: Verhindere Echo-Loops, wenn dieser Zustand bereits aktiv ist
    const currentIndustry = GlobalState.get("activeIndustry");
    const activeSectors = GlobalState.get("activeSectors");
    const currentTicker = activeSectors ? Array.from(activeSectors)[0] : null;

    let targetSector = sectorName;
    if (!targetSector && activeSectors.size > 0) {
        targetSector = currentTicker;
    }
    let ticker = getTickerFromSectorName(targetSector);
    if (!ticker && targetSector) {
        ticker = targetSector;
    }

    // Wenn Sektor und Industrie exakt unverändert sind, gar nichts tun (stoppt den Loop)
    if (currentIndustry === industryName && currentTicker === ticker) {
        return;
    }

    console.log("🔍 RS-Modul externer Filter:", { sectorName, ticker, industryName });

    activeSectors.clear();
    if (ticker) activeSectors.add(ticker);
    GlobalState.get("activeSectors", activeSectors);
    GlobalState.set("activeIndustry", industryName);

    // Sektor-Pills UI aktualisieren
    renderSectorPills("rs-sector-filter", async (sector) => {
        const currentActive = GlobalState.get("activeSectors");
        if (currentActive.has(sector)) currentActive.delete(sector);
        else currentActive.add(sector);
        GlobalState.set("activeSectors", currentActive);

        const { renderActiveCharts } = await import("./logic/rsLogic.js");
        renderActiveCharts();
    });

    // Charts neu rendern
    const { renderActiveCharts } = await import("./logic/rsLogic.js");
    if (typeof renderActiveCharts === 'function') {
        renderActiveCharts();
    } else {
        await initCharts();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!GlobalState.get("activeSectors")) {
        GlobalState.set("activeSectors", new Set());
    }

    renderSectorPills("rs-sector-filter", async (sector) => {
        const active = GlobalState.get("activeSectors");

        // Toggle
        if (active.has(sector)) active.delete(sector);
        else active.add(sector);

        GlobalState.set("activeSectors", active);

        // Charts aktualisieren
        const { renderActiveCharts } = await import("./logic/rsLogic.js");
        renderActiveCharts();
    });

    await initCharts();
});