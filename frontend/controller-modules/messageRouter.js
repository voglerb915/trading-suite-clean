// controller-modules/messageRouter.js
import { controllerState } from './state.js';
import { sendDashboardInit } from './uiDispatcher.js';

// Verhindert zu schnelles Wiederholen von INIT (Sperre für 1 Sekunde)
let lastInitTime = 0;

export function initMessageRouter(filterStocksHandler, filterSignalsHandler, stockDetailsHandler, listHandler, focusViewHandler) {
    window.addEventListener("message", async (event) => {
        const msg = event.data;
        if (!msg || typeof msg !== "object") return;

        const action = msg.action || msg.type;
        // Zu viel Spam in der Console bei INIT unterdrücken
        if (action !== "INIT") {
            console.log("CockpitController: Nachricht erhalten via Router:", action, msg);
        }

        if (msg.type === "REQUEST" || !msg.type) {
            
            switch(msg.action) {
                case "INIT": {
                    const now = Date.now();
                    // Wenn ein INIT vor weniger als 1000ms kam, ignorieren (verhindert INIT-Stürme)
                    if (now - lastInitTime < 1000) {
                        return;
                    }
                    lastInitTime = now;
                    
                    console.log("MessageRouter: Iframe hat INIT angefordert (wird verarbeitet).");
                    try {
                        sendDashboardInit(controllerState);
                    } catch (err) {
                        console.error("Fehler beim Senden des Dashboard-Inits:", err);
                    }
                    break;
                }

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
                    if (msg.payload) {
                        controllerState.midSignals = msg.payload.midSignals;
                        controllerState.sparkSignals = msg.payload.sparkSignals;
                    }
                    break;

                case "GET_STOCK_DETAILS":
                    if (typeof stockDetailsHandler === "function") stockDetailsHandler(msg.payload);
                    break;

                case "GET_LIST":
                    if (typeof listHandler === "function") listHandler(msg.payload);
                    break;

                case "SELECT_SECTOR":
                case "SET_SECTOR": {
                    const sectorName = msg.payload?.sectorName;
                    broadcastToIframes({ type: "RESPONSE", action: "SET_SECTOR", payload: { sectorName } });
                    break;
                }

                case "SELECT_INDUSTRY":
                case "SET_INDUSTRY": {
                    const { sectorName, industryName } = msg.payload || {};
                    broadcastToIframes({ 
                        type: "RESPONSE", 
                        action: "SET_INDUSTRY", 
                        payload: { sectorName, industryName } 
                    });
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
                    if (msg.action) {
                        broadcastToIframes(msg);
                    }
            }
        } else {
            broadcastToIframes(msg);
        }
    });
}

function broadcastToIframes(message) {
    const iframeIds = ['iframe-dashboard', 'iframe-lab', 'iframe-charting'];
    iframeIds.forEach(id => {
        const frame = document.getElementById(id);
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage(message, "*");
        }
    });
}