// frontend/apps/dashboard/js/structure/renderDashboardTools.js
import { renderSignalsList } from "../lists/signalsList/renderSignalsList.js";
import { renderWatchlist } from "../lists/watchList/renderWatchList.js";
import { renderOpenOrders } from "../lists/openOrdersList/renderOpenOrders.js";
import { renderActiveOrders } from "../lists/activeOrdersList/renderActiveOrders.js";
import { renderEtfsList } from "../lists/etfsList/renderEtfsList.js";

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
    const activeStrategy = state.strategy && state.strategy !== "none" ? state.strategy : null;
    
    // 1. Hole die rohen Signal-Items für die aktive Strategie
    const rawSignals = (activeStrategy && state.strategyItems?.[activeStrategy]) 
        ? state.strategyItems[activeStrategy] 
        : (state.midSignals?.data || window.dataStore?.midSignals?.data || []);

    // Erstelle ein Set aller Ticker, die nach den *globalen* Filtern (Index, DaysInTrend, Sektor etc.) 
    // aktuell in der stocksList übrig sind!
    const activeStockTickers = new Set((state.stocks || []).map(s => s.ticker));
    const baseStocksMap = new Map((state.stocksOriginal || []).map(s => [s.ticker, s]));

    // 2. Mappe die Signale und filtere DIREKT gegen die global gefilterten state.stocks
    let stocksWithSignals = rawSignals.map(sig => {
        const ticker = typeof sig === "string" ? sig : (sig.ticker || sig.symbol);
        const baseStock = baseStocksMap.get(ticker) || {};
        
        return {
            ...baseStock,
            ...(typeof sig === "object" ? sig : {}),
            strategy: activeStrategy || sig.strategy
        };
    });

    // 3. Wende nur noch die Signal-spezifische Vorauswahl an UND schränke auf das ein, 
    // was durch die globale Filterkette (state.stocks) gegangen ist!
    stocksWithSignals = stocksWithSignals.filter(s => {
        if (!activeStockTickers.has(s.ticker)) return false; // Hält sich an alle globalen Filter (Index, DaysInTrend etc.)

        if (activeStrategy) {
            const strat = s.strategy;
            return Array.isArray(strat) ? strat.includes(activeStrategy) : strat === activeStrategy;
        }
        return true;
    });

    renderSignalsList(stocksWithSignals, state, content);
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