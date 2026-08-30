import { renderDashboardOverview } from "./render/renderDashboard.js";
import { renderSectorsList } from "./render/renderSectorsList.js";

/*----------------------------------
1. Globaler State
----------------------------------*/
const GlobalState = {
    data: [],
    selectedTicker: null,
    view: 'overview',
    sector: null   // <--- hinzufügen
};


/*----------------------------------
2. Data-Layer
----------------------------------*/
async function loadDashboardData() {
    try {
        const res = await fetch("http://localhost:4000/api/sectors/won-db");
        if (!res.ok) throw new Error("Sektoren konnten nicht geladen werden");

        const sectors = await res.json();

        GlobalState.data = sectors;

        renderSectorsList(sectors, GlobalState);

        return sectors;
    } catch (err) {
        console.error("Fehler im Dashboard Data-Layer:", err);
        return [];
    }
}


/*----------------------------------
3. Navigation (Dashboard-Interne Ansichten)
----------------------------------*/
function switchDashboardView(viewId) {
    GlobalState.view = viewId;
}

/*----------------------------------
4. UI-Layer (Rendering)
----------------------------------*/
// bleibt unverändert – Render-Funktionen kommen aus den Imports

/*----------------------------------
5. Controller
----------------------------------*/
async function initDashboardSync() {
    await loadDashboardData();
}

/*----------------------------------
6. Event-Handler
----------------------------------*/
document.addEventListener("dashboard:cardClick", (e) => {
    const ticker = e.detail;
    GlobalState.selectedTicker = ticker;
    console.log("Dashboard-Detail für:", ticker);
});
document.addEventListener("dashboard:sectorClick", (e) => {
  const sector = e.detail;
  GlobalState.sector = sector;
  console.log("Sector selected:", sector);
  renderSectorsList(GlobalState.data, GlobalState);
});

/*----------------------------------
7. Initialisierung
----------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
    console.log("New Dashboard initialisiert...");
    initDashboardSync();
});
