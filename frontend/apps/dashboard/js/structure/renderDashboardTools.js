// frontend/apps/dashboard/js/structure/renderDashboardTools.js
import { renderSignalsList } from "../lists/signalsList/renderSignalsList.js";
import { renderWatchlist } from "../lists/watchList/renderWatchList.js";
import { renderOpenOrders } from "../lists/openOrdersList/renderOpenOrders.js";
import { renderActiveOrders } from "../lists/activeOrdersList/renderActiveOrders.js";
import { renderEtfsList } from "../lists/etfsList/renderEtfsList.js";
import { filterSignals } from "../lists/signalsList/signalsFilterLogic.js";





export function renderDashboardTools(state) {
    const tabHeaders = document.querySelectorAll(".tab-header .tab-item");
    const tabContent = document.getElementById("tools-tab-content");

    if (!tabHeaders || !tabContent) return;

    // ⭐ Zentraler SSE-Listener für Live-Order-Updates im Dashboard
    initDashboardSSE(tabContent, state);

    // ⭐ Tab-Klick-Handler
    tabHeaders.forEach(tab => {
        tab.onclick = function(e) {
            e.stopPropagation();

            tabHeaders.forEach(t => t.classList.remove("active"));
            this.classList.add("active");

            const targetTab = this.getAttribute("data-tab");

            // ⭐ Signals-Tab IMMER über renderActiveTab laden
            renderActiveTab(targetTab, state, tabContent);
        };
    });

    // ⭐ Initiales Rendern nach Daten-Load
    window.addEventListener("dataStoreReady", () => {
        const activeTab = document.querySelector(".tab-header .tab-item.active");
        if (activeTab) {
            const tabName = activeTab.getAttribute("data-tab");
            renderActiveTab(tabName, state, tabContent);
        }
    });
}

let globalEventSource = null; // Global halten, um Dubletten zu verhindern

function initDashboardSSE(tabContent, state) {
    // Falls bereits eine Verbindung existiert, erst schließen!
    if (globalEventSource) {
        globalEventSource.close();
        globalEventSource = null;
    }

    globalEventSource = new EventSource('http://localhost:4000/api/ibkr/events');

    globalEventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'REFRESH_ORDERS') {
                console.log("⚡ Live-Update via SSE empfangen!");

                const activeTab = document.querySelector(".tab-header .tab-item.active");
                if (activeTab && activeTab.getAttribute("data-tab") === "active-orders") {
                    console.log("🔄 Aktiver Tab ist 'active-orders'. Aktualisiere Ansicht...");
                    renderActiveOrders(state, tabContent);
                }
            }
        } catch (err) {
            console.error("Fehler beim Verarbeiten des SSE-Events:", err);
        }
    };

    globalEventSource.onerror = function() {
        if (globalEventSource) {
            globalEventSource.close();
            globalEventSource = null;
        }
        setTimeout(() => initDashboardSSE(tabContent, state), 3000);
    };
}





export function renderActiveTab(tabName, state, content) {

    content.innerHTML = "";

    const pillContainer = document.getElementById("tools-pill-container");
    if (pillContainer) pillContainer.innerHTML = "";

    switch (tabName) {

// ⭐⭐⭐ SIGNALS TAB ⭐⭐⭐
case "signals": {

    // 1. MID-Signale holen (Hauptquelle)
    const mid = window.dataStore?.midSignals?.data || [];

    // 2. SPARK-Signale holen (Buy/Sell-Impulse)
    const sparkMap = window.dataStore?.sparkSignals?.stocks || {};

    // 3. MID-Signale mit STOCK-Daten anreichern
    const enrichedSignals = mid.map(sig => {
        const stock = state.stocksOriginal?.find(s => s.ticker === sig.ticker) || {};
        return { ...stock, ...sig };
    });

    // 4. SPARK-Signal injizieren
    const mergedSignals = enrichedSignals.map(sig => {
        const sparkSig = sparkMap[sig.ticker] || null;
        return { ...sig, spark: sparkSig };
    });

    // 5. STRATEGY-ITEMS injizieren (wie in stocksList)
    const mergedSignalsWithStrategy = mergedSignals.map(sig => {
        let out = sig;

        if (state.strategy === "stage3topping") {
            const arr = state.strategyItems?.stage3topping || [];
            const strat = arr.find(s => s.ticker === sig.ticker);
            if (strat) out = { ...sig, ...strat };
        }

        if (state.strategy === "insideday52w") {
            const arr = state.strategyItems?.insideday52w || [];
            const strat = arr.find(s => s.ticker === sig.ticker);
            if (strat) out = { ...sig, ...strat };
        }

        return out;
    });


    // 6. FILTER anwenden
    const filteredSignals = filterSignals(mergedSignalsWithStrategy, state);

    // 7. STRATEGY-SORTIERUNG (wie in stocksList)
    const sortedSignals = filteredSignals.sort((a, b) => {
        if (state.strategy && state.strategy !== "none" && state.strategy !== "all") {
            const valA = a.strategyValue ?? a.value ?? 0;
            const valB = b.strategyValue ?? b.value ?? 0;
            return valB - valA;
        }
        return 0;
    });

    // 8. Liste rendern
    renderSignalsList(sortedSignals, state, content);
    break;
}





        case "watchlist":
            renderWatchlist(state, content);
            break;

        case "open-orders":
            renderOpenOrders(state, content);
            break;

        case "active-orders":
            renderActiveOrders(state, content);
            break;

        case "etfs":
            renderEtfsList(state.etfs || [], content);
            break;

        default:
            content.innerHTML = "<p>Unbekannter Tab.</p>";
    }
}