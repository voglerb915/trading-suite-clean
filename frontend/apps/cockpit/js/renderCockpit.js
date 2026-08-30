// ===============================
// IMPORTS
// ===============================
import { HeaderTile } from "../tiles/instances/headerTile.js";
import { Top20Tile } from "../tiles/instances/top20Tile.js";
import { IndexPerformanceTile } from "../tiles/instances/indexPerformanceTile.js";
import { SectorOverviewTile } from "../tiles/instances/sectorOverviewTile.js";


// ===============================
// RENDER-FUNKTION
// ===============================
export function renderCockpit(state) {

    // State cachen, damit spätere Tiles darauf zugreifen können
    window.lastCockpitState = state;

    // 1) Header
    const headerEl = document.getElementById("cockpit-header");
    if (headerEl) {
        headerEl.innerHTML = HeaderTile(state);
    }

    // 2) Top 20
    const top20El = document.getElementById("cockpit-top20");
    if (top20El) {
        top20El.innerHTML = Top20Tile(state);
    }

    // 3) Index Performance
    const indexEl = document.getElementById("cockpit-index-performance");
    if (indexEl) {
        indexEl.innerHTML = IndexPerformanceTile(state);
    }

    // 4) Sector Overview
    const sectorEl = document.getElementById("cockpit-sectors");
    if (sectorEl) {
        sectorEl.innerHTML = SectorOverviewTile(state);
    }
}


// ===============================
// MESSAGE-LISTENER (NEU)
// ===============================

// Debug: Renderer wurde geladen
console.log("IFRAME: renderCockpit.js geladen", performance.now());

// Falls Daten schon vor dem Renderer angekommen sind:
if (window.lastCockpitState) {
    console.log("IFRAME: Render mit gecachtem State", performance.now());
    renderCockpit(window.lastCockpitState);
}

// Listener für spätere Nachrichten
window.addEventListener("message", (event) => {
    if (event.data?.type === "COCKPIT_DATA") {
        console.log("IFRAME: Render mit neuer Nachricht", performance.now());
        renderCockpit(event.data.state);
    }
});
