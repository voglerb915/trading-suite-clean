import GlobalState from "@shared/state/globalState.js";
import { initCharts } from "./logic/rsLogic.js";
import { renderSectorPills } from "./renderer/sectorPillsRenderer.js";

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
