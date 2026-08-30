document.addEventListener("dashboard:indexChange", (e) => {
    console.log("DEBUG INDEX EVENT:", e.detail);
});

/*----------------------------------
-1. MESSAGE BUFFER (MUSS GANZ OBEN SEIN)
----------------------------------*/
window._pendingMessages = [];
window.onmessage = (e) => {
    if (window._pendingMessages) {
        window._pendingMessages.push(e);
    }
};

/*----------------------------------
0. IMPORTS
----------------------------------*/
import { renderDashboard } from "./js/structure/renderDashboard.js";
import { renderDashboardHeaderLeft } from "./js/header/renderDashboardHeaderLeft.js";
import { renderDashboardHeaderCenter } from "./js/header/renderDashboardHeaderCenter.js";
import { renderDashboardHeaderRight } from "./js/header/renderDashboardHeaderRight.js";
import { renderActiveTab } from "./js/structure/renderDashboardTools.js";
import { renderStocksList } from "./js/lists/renderStocksList.js";


/*----------------------------------
1. DASHBOARD READY SIGNAL
----------------------------------*/
console.log("Dashboard JS loaded");
window.parent.postMessage({ type: "DASHBOARD_READY" }, "*");

/*----------------------------------
2. FETCH-BREMSE (RAM-REDIRECT)
----------------------------------*/
const originalFetch = window.fetch;
window.fetch = function(url, options) {
    if (url.includes('/api/market/')) {
        const dataStore = window.parent.dataStore;
        let mockData = [];

        if (url.includes('stocks')) mockData = dataStore?.baseStocks || [];
        else if (url.includes('sectors')) mockData = dataStore?.sectors || [];
        else if (url.includes('industries')) mockData = dataStore?.industries || [];
        else if (url.includes('etfs')) mockData = dataStore?.etfs || [];
        else if (url.includes('metrics') || url.includes('won-db')) mockData = {};

        return Promise.resolve(new Response(JSON.stringify(mockData)));
    }
    return originalFetch(url, options);
};

/*----------------------------------
3. GLOBALER STATE
----------------------------------*/
window.dashboardState = {
    sectors: [],
    industries: [],
    stocks: [],
    etfs: [],
    signals: [],
    sector: null,
    industry: null,
    ticker: null,
    referenceStock: null,
    breadcrumbs: "Alle Sektoren",
    strategy: "none",
    indexFilter: "all",
    search: "",
    filterEntryIndustries: false,
    filterExitIndustries: false,

    filterEntrySectors: false,
    filterExitSectors: false,

// NEUE STRUKTUR:
    // Für Signals-Liste
    filterEntryStocks: false,
    filterExitStocks: false,
    filterMidLong: false,
    filterMidExit: false,

    // ALTE STRUKTUR: (Wichtig für StocksList!)
    filterEntry: false, 
    filterExit: false,
};

/*----------------------------------
3b. START-SYNCHRONISATION
----------------------------------*/
window._dashboardReadyStocks = false;
window._dashboardReadySignals = false;

/*----------------------------------
4. LOAD DATA
----------------------------------*/
function loadDashboardData() {
    try {
        const cockpitData = window.parent.dataStore;
        const cockpitState = window.parent.cockpitState || {};

        if (!cockpitData || !Array.isArray(cockpitData.baseStocks) || cockpitData.baseStocks.length === 0) {
            console.log("loadDashboardData(): baseStocks im Cockpit NOCH NICHT verfügbar");
            return false;
        }

        console.log("loadDashboardData(): baseStocks LENGTH =", cockpitData.baseStocks.length);

        const currentStrategy = window.dashboardState.strategy;
        let stocks;

        if (currentStrategy !== "none") {
            const strategyStocks = cockpitState.stocks;
            if (Array.isArray(strategyStocks) && strategyStocks.length > 0) {
                stocks = strategyStocks;
            } else {
                stocks = cockpitData.baseStocks;
            }
        } else {
            stocks = cockpitData.baseStocks;
        }

        window.dashboardState = {
            ...window.dashboardState,
            strategy: currentStrategy,
            sectors: cockpitData.sectors || [],
            industries: cockpitData.industries || [],
            etfs: cockpitData.etfs || [],
            stocks
        };

        return true;

    } catch (err) {
        console.error("❌ Fehler beim Laden der Dashboard-Daten:", err);
        return false;
    }
}


/*----------------------------------
5. HEADER RENDERN
----------------------------------*/
function renderHeader() {
    renderDashboardHeaderLeft(window.dashboardState);
    renderDashboardHeaderCenter(window.dashboardState);
    renderDashboardHeaderRight(window.dashboardState);
}

/*----------------------------------
6. UPDATE + RENDER
----------------------------------*/
let isRendering = false;

function updateAndRenderDashboard() {
    if (isRendering) return;

    if (!Array.isArray(window.dashboardState.stocks)) {
        window.dashboardState.stocks = [];
    }

    isRendering = true;

    requestAnimationFrame(() => {
        try {
            renderHeader();
            renderDashboard(window.dashboardState);
        } catch (error) {
            console.error("Fehler beim Rendern:", error);
        } finally {
            // Egal ob Fehler oder Erfolg: Die Sperre wird immer gelöst
            isRendering = false; 
        }
    });
}

/*----------------------------------
7. STRATEGY CHANGE
----------------------------------*/
document.addEventListener("dashboard:strategyChange", async (e) => {
    const strategy = e.detail;
    window.dashboardState.strategy = strategy;

    if (window.parent && typeof window.parent.applyStrategy === "function") {
        await window.parent.applyStrategy(strategy);
    }
});

/*----------------------------------
7.1 INDEX CHANGE
----------------------------------*/
document.addEventListener("dashboard:indexChange", (e) => {
    const index = e.detail;
    window.dashboardState.indexFilter = index;
    updateAndRenderDashboard();
});

/*----------------------------------
SEARCH + RESET
----------------------------------*/
document.addEventListener("dashboard:reset", () => {
    // 1. Definiere den State mit null (nicht {})
    const cleanState = {
        sector: null,
        industry: null,
        ticker: null,
        strategy: "none",
        indexFilter: "all",
        search: "",
        referenceStock: null,
        filterEntry: false,
        filterExit: false,
        filterMidLong: false,
        filterMidExit: false,
        filterEntryStocks: false,
        filterExitStocks: false,
        filterEntrySectors: null, // Auf null setzen
        filterExitSectors: null,
        filterEntryIndustries: null,
        filterExitIndustries: null
    };

    // 2. State überschreiben
    window.dashboardState = { ...window.dashboardState, ...cleanState };

    // 3. UI-Aufräumen
    document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    // ⭐ ZUSATZ: Strategie-Dropdown erzwingen
        const strategySelect = document.getElementById("strategy-select"); // Stelle sicher, dass die ID stimmt
        if (strategySelect) {
            strategySelect.value = "none";
            // Falls du ein Framework oder ein Custom-Select benutzt, evtl. dispatch Event
            strategySelect.dispatchEvent(new Event('change')); 
        }
    // 4. Cockpit & Rendern
    document.dispatchEvent(new CustomEvent("dashboard:searchChange", { detail: "" }));
    updateAndRenderDashboard();
});

/*----------------------------------
8. CLICK EVENTS
----------------------------------*/
document.addEventListener("click", (e) => {

// ⭐ SIGNAL-PILLEN (Entry / Exit / Long / Mid-Exit)
const pill = e.target.closest(".pill");
if (pill) {
    const type = pill.dataset.type;

    switch (type) {
        case "entry-industries":
            window.dashboardState.filterEntryIndustries = !window.dashboardState.filterEntryIndustries;
            break;
        case "exit-industries":
            window.dashboardState.filterExitIndustries = !window.dashboardState.filterExitIndustries;
            break;
        case "entry-sectors":
            window.dashboardState.filterEntrySectors = !window.dashboardState.filterEntrySectors;
            break;
        case "exit-sectors":
            window.dashboardState.filterExitSectors = !window.dashboardState.filterExitSectors;
            break;

        // FÜR STOCKS-TAB (Die alten)
        case "filterEntry":
            window.dashboardState.filterEntry = !window.dashboardState.filterEntry;
            break;
        case "filterExit":
            window.dashboardState.filterExit = !window.dashboardState.filterExit;
            break;

        // FÜR SIGNALS-TAB (Die neuen)
        case "filterEntryStocks":
            window.dashboardState.filterEntryStocks = !window.dashboardState.filterEntryStocks;
            break;
        case "filterExitStocks":
            window.dashboardState.filterExitStocks = !window.dashboardState.filterExitStocks;
            break;
        case "filterMidLong":
            window.dashboardState.filterMidLong = !window.dashboardState.filterMidLong;
            break;
        case "filterMidExit":
            window.dashboardState.filterMidExit = !window.dashboardState.filterMidExit;
            break;
    } // <--- DIESE KLAMMER HAT GEFEHLT!

    updateAndRenderDashboard();
    return;
}

    // ⭐ STOCK CLICK
    const stockRow = e.target.closest("[data-stock]");
    if (stockRow) {
        const ticker = stockRow.dataset.stock;
        const item = window.dashboardState.stocks.find(s => s.ticker === ticker);
        if (!item) return;

        window.dashboardState.sector = item.sector || item.sector_name;
        window.dashboardState.industry = item.industry || item.industry_name;
        window.dashboardState.ticker = ticker;
        window.dashboardState.referenceStock = item;

        document.querySelectorAll('.stock-item').forEach(el =>
            el.classList.toggle('highlight-ticker', el.dataset.stock === ticker)
        );

        renderHeader();
        if (typeof window.renderChart === 'function') {
            window.renderChart(ticker);
        }
        return;
    }

    // ⭐ SECTOR / INDUSTRY CLICK
    const filterEl = e.target.closest("[data-sector]") || e.target.closest("[data-industry]");
    if (filterEl) {
        const type = filterEl.hasAttribute("data-sector") ? "sector" : "industry";
        const val = filterEl.getAttribute(`data-${type}`);
        const isBreadcrumb = filterEl.classList.contains('bc-link');

        if (type === "sector") {
            window.dashboardState.sector = isBreadcrumb ? val : 
                (window.dashboardState.sector === val ? null : val);
            window.dashboardState.industry = null;
        }

        if (type === "industry") {
            window.dashboardState.industry = isBreadcrumb ? val :
                (window.dashboardState.industry === val ? null : val);

            if (window.dashboardState.industry) {
                const allStocks = window.parent?.dataStore?.baseStocks || [];
                const sample = allStocks.find(s => 
                    (s.industry || s.industry_name) === val
                );
                if (sample) {
                    window.dashboardState.sector = sample.sector || sample.sector_name;
                }
            }
        }

        window.dashboardState.ticker = null;
        updateAndRenderDashboard();
    }
});

/*----------------------------------
9. INITIALISIERUNG
----------------------------------*/
function setupHeaderListeners() {
    const container = document.getElementById("dashboard-header-center");
    if (!container) return;

    if (!container.dataset.listenerAttached) {
        container.dataset.listenerAttached = "true";

        container.addEventListener("click", (ev) => {
            if (ev.target.dataset?.bc === "reset") {
                Object.assign(window.dashboardState, {
                    sector: null,
                    industry: null,
                    ticker: null,
                    strategy: "none"
                });

                document.querySelectorAll('.stock-item')
                    .forEach(el => el.classList.remove('highlight-ticker'));

                updateAndRenderDashboard();
            }
        });
    }
}

export function initDashboard() {
    console.log("initDashboard() START");

    if (!loadDashboardData()) {
        console.log("initDashboard() ABGEBROCHEN: loadDashboardData() → false");
        return;
    }

    console.log("initDashboard() → Daten geladen, render jetzt");
    setupHeaderListeners();
    updateAndRenderDashboard();

    // 🟢 HIER: Erzwinge das Rendering des aktiven Tabs
    const activeTabItem = document.querySelector(".tab-header .tab-item.active");
    const tabContent = document.getElementById("tools-tab-content");
    
    if (activeTabItem && tabContent) {
        const tabType = activeTabItem.getAttribute("data-tab");
        console.log("🚀 Initiales Tab-Rendering für:", tabType);
        
        // Wir importieren renderActiveTab (oder falls es global verfügbar ist)
        // und rufen es hier auf
        renderActiveTab(tabType, window.dashboardState, tabContent);
    } else {
        console.warn("⚠️ Konnte Tab-Container nicht finden. DOM noch nicht bereit?");
    }
}

window.addEventListener("message", (event) => {
    console.log("RAW MESSAGE:", event.data);

    const msg = event.data;
    const { type, stocks, sectors, industries, etfs, midSignals, sparkSignals, signals, payload, strategy } = msg;

    console.log(`📥 Message empfangen: ${type}`);

    // 1. INITIALISIERUNG durch Cockpit → Host → Router → NEW-DASHBOARD
    if (type === "INIT_DASHBOARD") {
        console.log("📥 INIT_DASHBOARD empfangen:", msg);

        // DataStore füllen
        window.dataStore = window.dataStore || {};
        window.dataStore.baseStocks   = stocks;
        window.dataStore.sectors      = sectors;
        window.dataStore.industries   = industries;
        window.dataStore.etfs         = etfs;
        window.dataStore.midSignals   = midSignals;
        window.dataStore.sparkSignals = sparkSignals;

        // Dashboard initialisieren
        initDashboard();

        return;
    }

    // 2. UPDATE: Stocks aktualisieren
    if (type === "UPDATE_STOCKS" || type === "UPDATE_DASHBOARD") {

        if (typeof strategy === "string") {
            window.dashboardState.strategy = strategy;
        }

        if (Array.isArray(stocks)) {
            window.dashboardState.stocks = stocks;
        }

        const finalSignals = Array.isArray(signals)
            ? signals
            : (Array.isArray(payload?.signals) ? payload.signals : null);

        if (finalSignals !== null) {
            window.dashboardState.signals = finalSignals;
        }

        // Nur die Stocks-Liste rendern
        renderStocksList(
            Object.values(window.dashboardState.stocks || {}),
            window.dashboardState
        );

        // KEIN initDashboard(), KEIN updateAndRenderDashboard()
        return;
    }
});


/*----------------------------------
12. MESSAGE BUFFER FLUSH
----------------------------------*/
if (window._pendingMessages) {
    for (const msg of window._pendingMessages) {
        window.dispatchEvent(new MessageEvent("message", msg));
    }
    window._pendingMessages = null;
}

/*----------------------------------
13. POLLING (SAFE FALLBACK)
----------------------------------
let pollCounter = 0;
const dataPoller = setInterval(() => {

    // Cockpit hat Daten → Dashboard initialisieren
    if (window.parent?.dataStore?.baseStocks?.length) {
        if (window.dashboardState.stocks.length === 0) {
            initDashboard();
        }
        clearInterval(dataPoller);
        return;
    }

    // Nach 10 Sekunden abbrechen (20 Polls)
    pollCounter++;
    if (pollCounter > 20) {
        clearInterval(dataPoller);
    }

}, 500);
*/