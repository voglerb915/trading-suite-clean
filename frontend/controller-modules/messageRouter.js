// controller-modules/messageRouter.js
import { controllerState } from './state.js';
import { sendDashboardInit } from './uiDispatcher.js';

export function initMessageRouter(filterStocksHandler, filterSignalsHandler, stockDetailsHandler, listHandler, focusViewHandler) {
    window.addEventListener("message", async (event) => {
        const msg = event.data;
        if (!msg || msg.type !== "REQUEST") return;

        console.log("CockpitController: REQUEST erhalten via Router:", msg.action);

        switch(msg.action) {
            case "INIT":
                console.log("MessageRouter: Iframe hat INIT angefordert.");
                // Prüfen ob stocks geladen sind, sonst kurz warten oder direkt senden
                sendDashboardInit(controllerState);
                break;

            case "FILTER_STOCKS":
                if (typeof filterStocksHandler === "function") {
                    await filterStocksHandler(msg.payload);
                }
                break;

            case "FILTER_SIGNALS":
                if (typeof filterSignalsHandler === "function") {
                    filterSignalsHandler(msg.payload);
                }
                break;

            case "UPDATE_SIGNALS":
                controllerState.midSignals = msg.payload.midSignals;
                controllerState.sparkSignals = msg.payload.sparkSignals;
                break;

            case "GET_STOCK_DETAILS":
                if (typeof stockDetailsHandler === "function") stockDetailsHandler(msg.payload);
                break;

            case "GET_LIST":
                if (typeof listHandler === "function") listHandler(msg.payload);
                break;

case "SELECT_SECTOR": {
            const sectorName = msg.payload?.sectorName;
            console.log("CONTROLLER ROUTER: Sektor-Signal erhalten für:", sectorName);

            // 1. An Dashboard weiterleiten
            const dashboardIframe = document.getElementById('iframe-dashboard');
            if (dashboardIframe && dashboardIframe.contentWindow) {
                dashboardIframe.contentWindow.postMessage({
                    type: "RESPONSE",
                    action: "SET_SECTOR",
                    payload: { sectorName }
                }, "*");
                console.log("✅ Sektor-Signal erfolgreich an iframe-dashboard gesendet.");
            } else {
                console.warn("⚠️ iframe-dashboard nicht gefunden!");
            }

            // 2. An Lab weiterleiten
            const labIframe = document.getElementById('iframe-lab');
            if (labIframe && labIframe.contentWindow) {
                labIframe.contentWindow.postMessage({
                    type: "RESPONSE",
                    action: "SET_SECTOR",
                    payload: { sectorName }
                }, "*");
                console.log("✅ Sektor-Signal erfolgreich an iframe-lab gesendet.");
            } else {
                console.warn("⚠️ iframe-lab nicht gefunden (oder aktuell nicht aktiv).");
            }

            break;
        }

case "SELECT_INDUSTRY": {
    const currentPayload = typeof payload !== 'undefined' ? payload : msg.payload;
    
    const dashboardIframe = document.getElementById('iframe-dashboard'); 
    if (dashboardIframe && dashboardIframe.contentWindow) {
        dashboardIframe.contentWindow.postMessage({
            type: "RESPONSE",
            action: "SET_INDUSTRY",
            payload: { 
                sectorName: currentPayload?.sectorName,
                industryName: currentPayload?.industryName 
            }
        }, "*");
    }
    break;
}

            case "GET_FOCUS_VIEW":
                if (typeof focusViewHandler === "function") focusViewHandler(msg.payload);
                break;

            case "EXPORT_TRADINGVIEW":
                if (msg.payload && msg.payload.type) {
                    fetch('http://localhost:4000/api/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(msg.payload)
                    }).catch(err => console.error("Netzwerkfehler beim Export:", err));
                }
                break;

            default:
                console.warn("Unbekannte Action im Router:", msg.action);
        }
    });
}