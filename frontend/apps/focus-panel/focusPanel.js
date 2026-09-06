import { setSector, setIndustry } from "./filters/filterActions.js";
import { filterState } from "./filters/filterState.js";
import { loadTiles } from "./logic/tileLoader.js";
import "@shared/css/sector.css";

// ----------------------------------------------------
// Neu-Render-Logik
// ----------------------------------------------------
export async function rerenderFocusPanel() {

    const [
        sectorTile, industryTile, spTile, ndxTile, djiTile, rutTile, noneTile
    ] = await loadTiles(filterState);

    document.getElementById('col-sector-industry').innerHTML = sectorTile + industryTile;
    document.getElementById('col-sp500').innerHTML = spTile;
    document.getElementById('col-ndx-dow').innerHTML = ndxTile + djiTile;
    document.getElementById('col-russell').innerHTML = rutTile;
    document.getElementById('col-other').innerHTML = noneTile;
}

// ----------------------------------------------------
// Broadcast der Filter
// ----------------------------------------------------
function broadcastFilter(filter) {
    const frames = document.querySelectorAll("iframe");
    frames.forEach(frame => {
        if (!frame.contentWindow) return;
        frame.contentWindow.postMessage(
            { type: "FOCUS_FILTER_UPDATE", filter },
            "*"
        );
    });
}

// ----------------------------------------------------
// Public API für Tiles
// ----------------------------------------------------
window.focusPanelSelectSector = function (sector) {
    setSector(sector);
    broadcastFilter({ sector });
    rerenderFocusPanel();
};

window.focusPanelSelectIndustry = function (industry) {
    setIndustry(industry);
    broadcastFilter({ industry });
    rerenderFocusPanel();
};

// ----------------------------------------------------
// Empfang externer Filter-Updates
// ----------------------------------------------------
window.addEventListener("message", (event) => {
    if (event.data?.type === "FOCUS_FILTER_UPDATE") {
        const { sector, industry } = event.data.filter || {};

        if (sector !== undefined) setSector(sector);
        if (industry !== undefined) setIndustry(industry);

        rerenderFocusPanel();
    }
});

// ----------------------------------------------------
// Initialisierung
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    rerenderFocusPanel();
});
