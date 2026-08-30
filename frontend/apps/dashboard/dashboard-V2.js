// ======================================================
//  DASHBOARD — FINAL VERSION (Dashboard filtert, Cockpit liefert Daten)
// ======================================================
/*
1. IMPORTS
2. GLOBALER STOCK-CLICK-HANDLER
3. GLOBAL STATE
4. INIT REQUEST
5. REQUEST SENDER
6. RESPONSE HANDLER
7. RENDER ALL
8. Strategy-Merge (lokal im Dashboard)
9. Lokale Filterlogik
10. StrategyChange Handler
11. Index, Search, Reset
12. CLICK HANDLER
13. READY
*/

console.log("Dashboard NewStructure loaded");
let dashboardReady = false;

// ------------------------------------------------------
// 1. IMPORTS
// ------------------------------------------------------
import { renderDashboard } from "./js/structure/renderDashboard.js";
import { renderDashboardTools, renderActiveTab } from "./js/structure/renderDashboardTools.js";
import { strategyEngine } from "./js/strategies/strategyEngine.js";
import { filterAndSortStocks } from "./js/lists/stocksList/stocksFilterLogic.js";

// ------------------------------------------------------
// 2. GLOBALER STOCK-CLICK-HANDLER (wie früher)
// ------------------------------------------------------
window.handleStockClick = function(ticker, industry, sector) {
    console.log("handleStockClick → Sende GET_STOCK_DETAILS:", ticker);

    window.parent.postMessage({
        type: "REQUEST",
        action: "GET_STOCK_DETAILS",
        payload: { ticker }
    }, "*");
};

window.dashboardState = {
    
    stocks: [],
    stocksOriginal: [],

    sectors: [],
    industries: [],
    etfs: [],

    strategy: "none",
    strategyItems: {},

    index: "all",
    search: "",
    sector: null,
    industry: null,
    ticker: null,

    // NEU: Hier gehört daysInTrend hinein
    daysInTrend: null,

    // Stocks / Sector / Industry (Buy / Sell)
    filterBuyStocks: false,
    filterSellStocks: false,
    filterBuyIndustries: false,
    filterSellIndustries: false,
    filterBuySectors: false,
    filterSellSectors: false,

    // ⭐ KORREKTE State-Variablen für getrennte Long- & Exit-Phasen
    // ⭐ Ergänze diese direkt im window.dashboardState:
    phaseLong: "all",
    phaseExit: "all",
    
    activeTypes: {
        long: true,
        exit: true
    },

    // Signalliste (BuySignals / SellSignals für SparkSignals)
    filterBuySignals: false,
    filterSellSignals: false,

    // ❌ ALTE MidSignals-Flags müssen raus
    // filterLongMid: true,
    // filterExitMid: true,

    // ❌ ALTE Phase-Flags müssen raus
    // selectedLongPhase: "all",
    // selectedExitPhase: "all",

    midSignals: { stocks: {} },
    sparkSignals: { stocks: {}, sectors: {}, industries: {} },

    industryMap: new Map(),
    totalInd: 0,

    referenceStock: null
};


// ------------------------------------------------------
// buildIndustryMap (NEU)
// ------------------------------------------------------
function buildIndustryMap(industries) {
    const map = new Map();
    industries.forEach(ind => {
        map.set(ind.industry, ind.rank);
    });

    const totalInd = industries.length;
    return { map, totalInd };
}


// ------------------------------------------------------
// 4. INIT REQUEST
// ------------------------------------------------------
let initSent = false;

function requestInit() {
    if (initSent) return;
    initSent = true;

    window.parent.postMessage({
        type: "REQUEST",
        action: "INIT",
        payload: {}
    }, "*");
}

requestInit();

// ------------------------------------------------------
// 5. REQUEST SENDER
// ------------------------------------------------------
function sendRequest(action, payload) {
    window.parent.postMessage({
        type: "REQUEST",
        action,
        payload
    }, "*");
}

function handleExportAction() {
    console.log("🔍 DEBUG STATE:", dashboardState);
    console.log("🔍 LAST PROCESSED:", dashboardState?.lastProcessedStocks);
    
    // Fallback, falls das Array dort leer ist:
    const currentData = dashboardState?.lastProcessedStocks || [];
    console.log("EXPORT -> Tatsächliche Länge:", currentData.length);
}

// ------------------------------------------------------
// 6. RESPONSE HANDLER
// ------------------------------------------------------
window.addEventListener("message", (event) => {
    console.log("RAW MESSAGE:", event.data);   // ⭐ MUSS erscheinen

    const msg = event.data;
    if (!msg || msg.type !== "RESPONSE") {
        return;
    }

    switch (msg.action) {

        case "INIT": {
            console.log("INIT empfangen:", msg.payload);
            console.log("DASHBOARD INIT → STOCKS ORIGINAL LENGTH:", dashboardState.stocksOriginal.length);
            console.log("DASHBOARD INIT → STRATEGY ITEMS LENGTH:", dashboardState.strategyItems?.stage3topping?.length);

            // Basisdaten
            dashboardState.stocksOriginal = msg.payload.stocks || [];
            dashboardState.stocks         = dashboardState.stocksOriginal;

            // ⭐ Strategie anwenden
            const fn = strategyEngine[dashboardState.strategy];
            if (fn) {
                dashboardState.stocks = fn(dashboardState.stocksOriginal);
            }

            dashboardState.sectors    = msg.payload.sectors || [];
            dashboardState.industries = msg.payload.industries || [];
            dashboardState.etfs       = msg.payload.etfs || [];

            // ⭐ IndustryMap erzeugen
            const { map, totalInd } = buildIndustryMap(dashboardState.industries);
            dashboardState.industryMap = map;
            dashboardState.totalInd = totalInd;

            // StrategyItems
            dashboardState.strategyItems = msg.payload.strategyItems || {};

            // MidSignals direkt aus der neuen API-Struktur übernehmen
            const rawMid = msg.payload.midSignals || {};
            dashboardState.midSignals = {
                latestDate: rawMid.latestDate || null,
                totalCount: rawMid.totalCount || 0,
                counts: rawMid.counts || {},
                data: Array.isArray(rawMid.data) ? rawMid.data : []
            };

            // SparkSignals normalisieren (Objekt → garantierte Struktur)
            const rawSpark = msg.payload.sparkSignals || {};
            dashboardState.sparkSignals = {
                stocks: rawSpark.stocks || {},
                sectors: rawSpark.sectors || {},
                industries: rawSpark.industries || {}
            };

            // ⭐ WICHTIG: Struktur für Renderer bereitstellen
            window.dataStore = window.dataStore || {};
            window.dataStore.sparkSignals = dashboardState.sparkSignals;
            window.dataStore.midSignals   = dashboardState.midSignals;

            console.log(
                "DEBUG: SparkSignals im Dashboard:",
                Object.keys(dashboardState.sparkSignals.stocks).length,
                "Stocks"
            );

            break;
        }

        case "COCKPIT_DATA": {
            console.log("Dashboard: COCKPIT_DATA empfangen:", msg.payload);
            console.log("DASHBOARD COCKPIT_DATA → STOCKS ORIGINAL LENGTH:", dashboardState.stocksOriginal.length);
            console.log("DASHBOARD COCKPIT_DATA → STRATEGY ITEMS LENGTH:", dashboardState.strategyItems?.stage3topping?.length);

            dashboardState.stocksOriginal = msg.payload.stocks || [];
            dashboardState.stocks         = dashboardState.stocksOriginal;

            dashboardState.sectors    = msg.payload.sectors || [];
            dashboardState.industries = msg.payload.industries || [];
            dashboardState.etfs       = msg.payload.etfs || [];

            const { map, totalInd } = buildIndustryMap(dashboardState.industries);
            dashboardState.industryMap = map;
            dashboardState.totalInd = totalInd;

            // MidSignals direkt aus der neuen API-Struktur übernehmen
            const rawMid2 = msg.payload.midSignals || {};
            dashboardState.midSignals = {
                latestDate: rawMid2.latestDate || null,
                totalCount: rawMid2.totalCount || 0,
                counts: rawMid2.counts || {},
                data: Array.isArray(rawMid2.data) ? rawMid2.data : []
            };

            // SparkSignals übernehmen
            const rawSpark2 = msg.payload.sparkSignals || {};
            dashboardState.sparkSignals = {
                stocks: rawSpark2.stocks || {},
                sectors: rawSpark2.sectors || {},
                industries: rawSpark2.industries || {}
            };

            // Für Abwärtskompatibilität im globalen dataStore aktualisieren
            window.dataStore = window.dataStore || {};
            window.dataStore.midSignals = dashboardState.midSignals;

            renderAll();
            break;
        }

        case "STOCK_DETAILS": {
            dashboardState.ticker   = msg.payload.ticker;
            dashboardState.sector   = msg.payload.stock.sector || msg.payload.stock.sector_name;
            dashboardState.industry = msg.payload.stock.industry || msg.payload.stock.industry_name;
            dashboardState.referenceStock = msg.payload.stock;

            window.dataStore = window.dataStore || {};
            window.dataStore.referenceStock = msg.payload.stock;

            console.log("STOCK_DETAILS STATE REF:", dashboardState.referenceStock);
            // ⭐ WICHTIG: Dashboard neu rendern
            renderDashboard(dashboardState);

            break;
        }

        default:
            console.warn("Dashboard: Unbekannte Action ignoriert:", msg.action);
            return;
    }
});

// ------------------------------------------------------
// 7. RENDER ALL
// ------------------------------------------------------
function renderAll() {
    renderDashboard(dashboardState);
    renderDashboardTools(dashboardState);

 

    const activeTab = document.querySelector(".tab-header .tab-item.active");
    const tabContent = document.getElementById("tools-tab-content");

    if (activeTab && tabContent) {
        renderActiveTab(activeTab.getAttribute("data-tab"), dashboardState, tabContent);
    }

    // ⭐ ZENTRALE UI-SYNCHRONISATION
    const indexSelect = document.getElementById("index-select");
    if (indexSelect) {
        indexSelect.value = dashboardState.indexFilter || "all";
    }

    const strategySelect = document.getElementById("strategy-select");
    if (strategySelect) {
        strategySelect.value = dashboardState.strategy || "none";
    }
}
// ------------------------------------------------------
// 8. Strategy-Merge (lokal im Dashboard) — FINAL CLEAN VERSION
// ------------------------------------------------------
function mergeStrategies(baseStocks, strategyItemsMap, selectedStrategies) {
    const merged = baseStocks.map(stock => ({ ...stock }));

    for (const strategyName of selectedStrategies) {
        const items = strategyItemsMap[strategyName] || [];
        const map = new Map(items.map(s => [s.ticker, s]));

        let hitCount = 0;

        for (const stock of merged) {
            const strat = map.get(stock.ticker);
            if (strat) {
                hitCount++;

                if (!Array.isArray(stock.strategy)) {
                    stock.strategy = [];
                }
                stock.strategy.push(strategyName);
                stock.strategyValue = strat.strategyValue;
                stock.strategyRank  = strat.strategyRank;
            }
        }

        // ⭐ Nur EIN Log pro Strategie pro Tick
        if (!mergeStrategies._logged) {
            console.log(`DEBUG: ${strategyName} Treffer: ${hitCount}`);
            mergeStrategies._logged = true;
        }
    }

    return merged;
}


// ------------------------------------------------------
// 9. Lokale Filterlogik
// ------------------------------------------------------

function filterStocksUI() {
    // ⭐ FIX: Wir starten IMMER beim Original-Datensatz.
    // So werden alle Filter bei jedem Aufruf frisch auf den vollen Datenbestand angewendet.
    let filtered = [...dashboardState.stocksOriginal];

    console.log("DEBUG: Filter startet. Strategie:", dashboardState.strategy, "Index:", dashboardState.indexFilter);

    // ------------------------------------------------------
    // Strategy-Filter in filterStocksUI (FINAL VERSION)
    // ------------------------------------------------------
    if (dashboardState.strategy && dashboardState.strategy !== "none") {

        // 1) FRONTEND-Strategien
        const frontendFn = strategyEngine[dashboardState.strategy];
        if (frontendFn) {
            filtered = frontendFn(filtered);
        }

        // 2) BACKEND-Strategien
        else {
            const merged = mergeStrategies(
                filtered,
                dashboardState.strategyItems,
                [dashboardState.strategy]
            );

            filtered = merged.filter(s => {
                const strategySource = s.strategy || [];
                return Array.isArray(strategySource) && strategySource.includes(dashboardState.strategy);
            });
        }
    }


    // 2. Sector
    if (dashboardState.sector && dashboardState.sector !== "all") {
        filtered = filtered.filter(s =>
            (s.sector || s.sector_name) === dashboardState.sector
        );
    }

    // 3. Industry
    if (dashboardState.industry) {
        filtered = filtered.filter(s =>
            (s.industry || s.industry_name) === dashboardState.industry
        );
    }

    // 4. Index
    if (dashboardState.indexFilter && dashboardState.indexFilter !== "all") {
        filtered = filtered.filter(s =>
            Array.isArray(s.index) &&
            s.index.includes(dashboardState.indexFilter)
        );
    }

    // 5. Search
    if (dashboardState.search && dashboardState.search.length > 0) {
        const q = dashboardState.search.toLowerCase();
        filtered = filtered.filter(s =>
            s.ticker?.toLowerCase().includes(q) ||
            s.name?.toLowerCase().includes(q)
        );
    }

    // 6. Days in Trend Filter
    if (dashboardState.daysInTrend !== null) {
        filtered = filtered.filter(s => 
            Number(s.daysInTrend) === Number(dashboardState.daysInTrend)
        );
    }
    
    // Ergebnis im globalen State speichern
    dashboardState.stocks = filtered;
    console.log("DEBUG Filter - Finales Ergebnis:", filtered.length);
}

window.filterStocksUI = filterStocksUI;

// ------------------------------------------------------
// 10. StrategyChange Handler (FINAL CLEAN VERSION)
// ------------------------------------------------------
function handleStrategyChange(e) {
    const selectedStrategy = e.detail;
    dashboardState.strategy = selectedStrategy;

    console.log("📌 StrategyChange:", selectedStrategy);

    // Immer vom Original starten
    let filtered = [...dashboardState.stocksOriginal];

    // 1) NONE → alles zurücksetzen
    if (selectedStrategy === "none") {
        dashboardState.stocks = filtered;
        filterStocksUI();
        renderAll();
        return;
    }

    // 2) FRONTEND-Strategien (UI-Filter)
    const frontendFn = strategyEngine[selectedStrategy];
    if (frontendFn) {
        console.log("Frontend-Strategie aktiv:", selectedStrategy);

        // Frontend-Strategie direkt anwenden
        filtered = frontendFn(filtered);

        dashboardState.stocks = filtered;

        filterStocksUI();
        renderAll();
        return;   // ❗ WICHTIG: Backend wird NICHT ausgeführt
    }

    // 3) BACKEND-Strategien (kommen aus CockpitController)
    console.log("Backend-Strategie aktiv:", selectedStrategy);

    const backendItems = dashboardState.strategyItems[selectedStrategy];

    if (!backendItems) {
        console.warn("⚠ Backend-Strategie hat keine Daten:", selectedStrategy);
        dashboardState.stocks = [];
        filterStocksUI();
        renderAll();
        return;
    }

    const merged = mergeStrategies(
        dashboardState.stocksOriginal,
        dashboardState.strategyItems,
        [selectedStrategy]
    );

    dashboardState.stocks = merged;

    filterStocksUI();
    renderAll();
}



document.addEventListener("dashboard:strategyChange", handleStrategyChange);
if (window.parent && window.parent !== window) {
   // window.parent.document.addEventListener("dashboard:strategyChange", handleStrategyChange);
}

// ------------------------------------------------------
// 11. Index, Search, Reset
// ------------------------------------------------------


// In dashboard.js, Abschnitt 10
document.addEventListener("dashboard:indexChange", (e) => {
    console.log("📌 dashboard.js: Event empfangen mit Wert:", e.detail); // WICHTIG: Erscheint das hier?
    
    dashboardState.indexFilter = e.detail; 
    
    // Prüfe, ob die Daten überhaupt existieren
    console.log("DEBUG: Aktueller Index-Filter Wert:", dashboardState.indexFilter);
    
    filterStocksUI();
    renderAll();
});

document.addEventListener("dashboard:searchChange", (e) => {
    dashboardState.search = e.detail;
    filterStocksUI();
    renderAll();
});

document.addEventListener("dashboard:reset", () => {
    dashboardState.sector = null;
    dashboardState.industry = null;
    dashboardState.ticker = null;

    dashboardState.strategy = "none";
    dashboardState.indexFilter = "all";       // ⭐ FIX
    dashboardState.search = "";

    dashboardState.filterEntryStocks = false;
    dashboardState.filterExitStocks = false;
    dashboardState.filterMidLong = false;
    dashboardState.filterMidExit = false;

    dashboardState.referenceStock = null;

    dashboardState.stocks = dashboardState.stocksOriginal;

    filterStocksUI();
    renderAll();
});



// ------------------------------------------------------
// 12. CLICK HANDLER – FINAL VERSION
// ------------------------------------------------------

document.addEventListener("click", (e) => {

// ------------------------------------------------------
    // 1) MID-SIGNALS: LONG / EXIT / PHASE
    // ------------------------------------------------------
    const midItem = e.target.closest('.dropdown-item[data-phase-value]');
    if (midItem) {

        const type  = midItem.getAttribute('data-phase-type');   // "long" | "exit"
        const value = midItem.getAttribute('data-phase-value');  // "all" | "1".."6"

        // Sicherheitsnetz: Falls activeTypes im State fehlt, initialisieren
        if (!dashboardState.activeTypes) {
            dashboardState.activeTypes = { long: true, exit: true };
        }

        // --- LONG ---
        if (type === "long") {
            dashboardState.phaseLong = value;
            // Falls "all" gewählt wird, bleibt long aktiv, ansonsten steuerst du es hier
            dashboardState.activeTypes.long = true; 
        }

        // --- EXIT ---
        if (type === "exit") {
            dashboardState.phaseExit = value;
            dashboardState.activeTypes.exit = true;
        }

        // Dropdown schließen
        document.querySelectorAll('.pill-dropdown-menu').forEach(m => {
            m.style.display = 'none';
            m.classList.remove('show');
        });

        // Re-Render NUR Signals-Tab
        const toolsTabContent = document.getElementById("tools-tab-content");
        renderActiveTab("signals", dashboardState, toolsTabContent);
        return;
    }

    // ------------------------------------------------------
    // 2) DROPDOWN ÖFFNEN/SCHLIESSEN
    // ------------------------------------------------------
    const pillWithDropdown = e.target.closest('.pill-dropdown-wrapper');
    if (pillWithDropdown) {

        const isTrigger = e.target.closest('.pill');
        if (isTrigger) {

            const menu = pillWithDropdown.querySelector('.pill-dropdown-menu');
            if (menu) {

                // alle anderen schließen
                document.querySelectorAll('.pill-dropdown-menu').forEach(m => {
                    if (m !== menu) {
                        m.style.display = 'none';
                        m.classList.remove('show');
                    }
                });

                const visible = menu.classList.contains('show');
                if (visible) {
                    menu.style.display = 'none';
                    menu.classList.remove('show');
                } else {
                    menu.style.display = 'block';
                    menu.classList.add('show');
                }
            }
            return;
        }
    }

    // ------------------------------------------------------
    // 3) NORMALE PILLEN (Buy/Sell etc.)
    // ------------------------------------------------------
    const pill = e.target.closest(".pill");
    if (pill && !pill.closest('.pill-dropdown-wrapper')) {

        const type = pill.dataset.type;

        if (type && dashboardState.hasOwnProperty(type)) {
            dashboardState[type] = !dashboardState[type];
            filterStocksUI();
            renderAll();
        }
        return;
    }

    // ------------------------------------------------------
    // 4) KLICK AUSSERHALB SCHLIESST DROPDOWNS
    // ------------------------------------------------------
    if (!e.target.closest('.pill-dropdown-wrapper')) {
        document.querySelectorAll('.pill-dropdown-menu').forEach(m => {
            m.style.display = 'none';
            m.classList.remove('show');
        });
    }

    // ------------------------------------------------------
    // 5) STOCK CLICK
    // ------------------------------------------------------
    const stockRow = e.target.closest("[data-stock]");
    if (stockRow) {

        const ticker = stockRow.dataset.stock;

        if (dashboardState.ticker === ticker) {
            dashboardState.ticker = null;
            dashboardState.referenceStock = null;
        } else {
            const item = dashboardState.stocks.find(s => s.ticker === ticker);
            if (!item) return;

            dashboardState.sector   = item.sector || item.sector_name;
            dashboardState.industry = item.industry || item.industry_name;
            dashboardState.ticker   = ticker;
            dashboardState.referenceStock = item;
        }

        filterStocksUI();
        renderAll();
        return;
    }

    // ------------------------------------------------------
    // 6) SECTOR CLICK
    // ------------------------------------------------------
    const sectorEl = e.target.closest("[data-sector]");
    if (sectorEl) {

        const val = sectorEl.getAttribute("data-sector");

        dashboardState.sector   = dashboardState.sector === val ? null : val;
        dashboardState.industry = null;
        dashboardState.ticker   = null;

        filterStocksUI();
        renderAll();
        return;
    }

    // ------------------------------------------------------
    // 7) INDUSTRY CLICK
    // ------------------------------------------------------
    const industryEl = e.target.closest("[data-industry]");
    if (industryEl) {

        const val = industryEl.getAttribute("data-industry");

        dashboardState.industry = dashboardState.industry === val ? null : val;

        if (dashboardState.industry) {
            const sample = dashboardState.stocks.find(s =>
                (s.industry || s.industry_name) === val
            );
            if (sample) {
                dashboardState.sector = sample.sector || sample.sector_name;
            }
        }

        dashboardState.ticker = null;

        filterStocksUI();
        renderAll();
        return;
    }

    // ------------------------------------------------------
    // 8) EXPORT TRADINGVIEW
    // ------------------------------------------------------
    const exportTvBtn = e.target.closest("#export-tv");
    if (exportTvBtn) {

        const currentData =
            dashboardState.lastProcessedStocks ||
            dashboardState.filteredStocks ||
            dashboardState.stocks ||
            [];

        const meta = {
            strategy: dashboardState.strategy || 'none',
            sector: dashboardState.sector || 'All',
            industry: dashboardState.industry || 'All',
            index: dashboardState.index || 'All'
        };

        sendRequest("EXPORT_TRADINGVIEW", {
            type: 'TV_CUSTOM_SELECT',
            data: currentData,
            options: { meta }
        });
        return;
    }
});

// ------------------------------------------------------
// DAYS FILTER HANDLER (Für das D-Dropdown)
// ------------------------------------------------------
export function handleDaysFilterChange(value) {
    const currentState = window.dashboardState || window.currentDashboardState;
    if (!currentState) return;

    currentState.daysInTrend = value ? Number(value) : null;
    window.dashboardState = currentState;
    
    // UI aktualisieren (nutzt deine bestehenden Refresh-Methoden)
    if (typeof filterStocksUI === "function") filterStocksUI();
    if (typeof renderAll === "function") {
        renderAll();
    } else {
        const toolsTabContent = document.getElementById("tools-tab-content");
        if (typeof renderActiveTab === "function") {
            renderActiveTab("signals", currentState, toolsTabContent);
        }
    }
}

// Global binden für das onchange-Attribut im HTML
window.handleDaysFilterChange = handleDaysFilterChange;

/*
====================================================================
12. CLICK HANDLER für Watchlist - vorbereitet
====================================================================
*/

// Watchlist Interaktions-Stubs (Notizen, Order-Cart, Strategie, Delete)
window.handleWatchlistNote = function(id, ticker) {
    console.log(`[Stub] Notizen-Menü für ID ${id} (${ticker}) geklickt.`);
    // Hier wird später das Notizen-Popup/Menü getriggert
};

window.handleWatchlistOrder = function(id, ticker, strategy) {
    console.log(`[Stub] Order-Cart für ID ${id} (${ticker}) mit Strategie '${strategy}' geklickt.`);
    // Hier wird später das Menü mit den Strategie-Voreinstellungen geöffnet
};

window.handleWatchlistStrategySelect = function(id, currentStrategy) {
    console.log(`[Stub] Strategie-Auswahl für ID ${id} (Aktuell: '${currentStrategy}') geklickt.`);
    // Hier wird später die Strategie-Auswahl (Dropdown/Modal) gestartet
};

window.handleWatchlistDelete = function(id) {
    console.log(`[Stub] Delete für ID ${id} geklickt.`);
    // Hier läuft später deine Lösch-Logik zusammen
};



// ------------------------------------------------------
// 13. READY
// ------------------------------------------------------
console.log("Dashboard NewStructure ready.");
