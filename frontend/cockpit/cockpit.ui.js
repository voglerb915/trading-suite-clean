/* ============================================================
   COCKPIT UI – neue Version passend zur neuen Engine
   ============================================================ */

window.dataStore = {
    stocks: [],
    sectors: [],
    industries: [],
    etfs: [],
    metrics: {},
    finviz: {},
    midSignals: [],
    sparkSignals: {}
};


/* ------------------------------------------------------------
   1. RESPONSE-LISTENER – empfängt Daten vom neuen Controller
   ------------------------------------------------------------ */
window.addEventListener("message", (event) => {
    const msg = event.data;

    // ⭐ Nur Messages verarbeiten, die AUS dem Controller kommen
    if (event.source !== window.parent) return;

    if (!msg || msg.type !== "RESPONSE") return;

    switch (msg.action) {

        case "COCKPIT_DATA":
            window.dataStore = { ...window.dataStore, ...msg.payload };
            renderCockpit(window.dataStore);
            break;

        case "UPDATE_STOCKS":
        case "UPDATE_SECTORS":
        case "UPDATE_INDUSTRIES":
        case "UPDATE_ETFS":
        case "UPDATE_SIGNALS":
            Object.assign(window.dataStore, msg.payload);
            renderCockpit(window.dataStore);
            break;

        case "SET_INDUSTRY":
            // Ist für das Iframe bestimmt, hier im Cockpit-UI einfach ignorieren
            break;    

        default:
            console.warn("Cockpit UI: Unbekannte RESPONSE:", msg.action);
    }
});


/* ------------------------------------------------------------
   2. DOMContentLoaded – UI initialisieren
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Cockpit UI Initialisierung gestartet...");
});


/* ------------------------------------------------------------
   3. Rendering-Funktion (deine bestehende Cockpit-UI)
   ------------------------------------------------------------ */
function renderCockpit(state) {
    console.log("Cockpit render:", state);
    // Hier kommt deine echte Rendering-Logik rein
}
