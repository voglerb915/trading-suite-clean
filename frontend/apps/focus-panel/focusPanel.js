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

    // ⭐ DOM einfügen, nicht innerHTML
    const col1 = document.getElementById("col-sector-industry");
    const col2 = document.getElementById("col-sp500");
    const col3 = document.getElementById("col-ndx-dow");
    const col4 = document.getElementById("col-russell");
    const col5 = document.getElementById("col-other");

    col1.innerHTML = "";
    col1.appendChild(sectorTile);
    col1.appendChild(industryTile);

    col2.innerHTML = "";
    col2.appendChild(spTile);

    col3.innerHTML = "";
    col3.appendChild(ndxTile);
    col3.appendChild(djiTile);

    col4.innerHTML = "";
    col4.appendChild(rutTile);

    col5.innerHTML = "";
    col5.appendChild(noneTile);
}

// ----------------------------------------------------
// Broadcast der Filter
// ----------------------------------------------------
function broadcastFilter(filter) {
    if (filter.sector !== undefined) {
        window.parent.postMessage({
            type: "REQUEST",
            action: "SELECT_SECTOR",
            payload: { sectorName: filter.sector }
        }, "*");
    }
    
    if (filter.industry !== undefined) {
        window.parent.postMessage({
            type: "REQUEST",
            action: "SELECT_INDUSTRY",
            payload: { 
                sectorName: filter.sector, // <-- Sektor hier mitgeben!
                industryName: filter.industry 
            }
        }, "*");
    }
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

window.focusPanelResetFilter = function () {
    setSector(null);
    setIndustry(null);
    broadcastFilter({ sector: null, industry: null });
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