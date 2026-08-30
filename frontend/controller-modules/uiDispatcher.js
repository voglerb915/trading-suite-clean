// controller-modules/uiDispatcher.js
export function sendDashboardInit(controllerState) {
    const dashboardFrame = document.getElementById("iframe-dashboard");
    
    if (!dashboardFrame?.contentWindow) {
        console.warn("UI-Dispatcher: #iframe-dashboard nicht bereit.");
        return;
    }

    // Warten bis Basis-Daten da sind
    if (!controllerState.stocks || controllerState.stocks.length === 0) {
        return;
    }

    console.log("🔍 UI-Dispatcher - Sende Init-Daten an Dashboard:", {
        stocksCount: controllerState.stocks.length,
        sparkCount: Object.keys(controllerState.sparkSignals?.stocks || {}).length,
        stage3Count: controllerState.strategyItems?.stage3topping?.length || 0,
        insideDayCount: controllerState.strategyItems?.insideday52w?.length || 0
    });

dashboardFrame.contentWindow.postMessage({
        type: "RESPONSE",
        action: "INIT", // <-- Hier von "COCKPIT_DATA" auf "INIT" ändern!
        payload: {
            stocks: controllerState.stocks,
            sectors: controllerState.sectors,
            industries: controllerState.industries,
            etfs: controllerState.etfs,
            midSignals: controllerState.midSignals,
            sparkSignals: controllerState.sparkSignals,
            volumeExtract: controllerState.volumeExtract,
            strategyItems: controllerState.strategyItems
        }
    }, "*");
    
    console.log("UI-Dispatcher: COCKPIT_DATA erfolgreich an Iframe gesendet.");
}