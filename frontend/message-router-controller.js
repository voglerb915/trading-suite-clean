// ======================================================
//  CONTROLLER MESSAGE ROUTER — neue API
//  verarbeitet REQUEST / RESPONSE für cockpitcontroller.js
// ======================================================

console.log("Controller Message Router aktiv.");

// Frames
const engineFrame      = document.getElementById("iframe-cockpit");        // neue Engine
const dashboardFrame   = document.getElementById("iframe-dashboard");  // neues Dashboard
const focusPanelFrame  = document.getElementById("iframe-focuspanel");     // neues Focus Panel

const sendTo = (frame, data) => {
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage(data, "*");
    }
};


// ------------------------------------------------------
// 1. REQUEST → Engine
// ------------------------------------------------------
// Ergänzung im message-router-controller.js
window.addEventListener("message", (event) => {
    // Wenn der Controller sendet, ist event.source oft das window selbst
    const msg = event.data;
    
    // Debugging, um zu sehen, ob der Router den Controller überhaupt hört
    if (msg.type === "RESPONSE") {
        console.log("ROUTER: RESPONSE empfangen von:", event.source === window ? "Controller" : "iFrame");
    }
});
window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || msg.type !== "REQUEST") return;

    console.log("CONTROLLER ROUTER: REQUEST:", msg.action);

    sendTo(engineFrame, msg);
});


// ------------------------------------------------------
// 2. RESPONSE → Ziel-iFrame
// ------------------------------------------------------
window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || msg.type !== "RESPONSE") return;

    console.log("CONTROLLER ROUTER: RESPONSE:", msg.action);

    switch (msg.action) {

        // Dashboard Actions
        case "INIT":
        case "STOCKS":
        case "SIGNALS":
        case "STOCK_DETAILS":
        case "LIST":
        case "DASHBOARD_UPDATE":
        case "DASHBOARD_UPDATE":
            sendTo(dashboardFrame, msg);
            break;
case "COCKPIT_DATA":
    sendTo(dashboardFrame, msg);   // Dashboard bekommt die Daten!
    sendTo(engineFrame, msg);      // Cockpit bekommt sie weiterhin
    break;



        // Focus Panel
        case "FOCUS_VIEW":
            sendTo(focusPanelFrame, msg);
            break;

        // Updates für Engine (falls noch benötigt)
        case "UPDATE_STOCKS":
        case "UPDATE_SECTORS":
        case "UPDATE_INDUSTRIES":
        case "UPDATE_ETFS":
        case "UPDATE_SIGNALS":
            sendTo(engineFrame, msg);
            break;

        default:
            console.warn("CONTROLLER ROUTER: Unbekannte RESPONSE:", msg.action);
    }
});


