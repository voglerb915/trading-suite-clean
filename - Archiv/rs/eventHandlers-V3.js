// ======================================================
// CORE EVENT HANDLERS - Globale Klick- und Event-Logik
// ======================================================

import { dashboardState } from "./state.js";
import { filterStocksUI } from "./filterLogic.js";
import { renderAll } from "./renderer.js";
import { sendRequest } from "./api.js";
import { renderActiveTab } from "../js/structure/renderDashboardTools.js";

// ------------------------------------------------------
// 1. Globaler Stock-Click-Handler & Export
// ------------------------------------------------------
window.handleStockClick = function(ticker, industry, sector) {
    console.log("handleStockClick → Sende GET_STOCK_DETAILS:", ticker);

    window.parent.postMessage({
        type: "REQUEST",
        action: "GET_STOCK_DETAILS",
        payload: { ticker }
    }, "*");
};

export function handleExportAction() {
    console.log("🔍 DEBUG STATE:", dashboardState);
    console.log("🔍 LAST PROCESSED:", dashboardState?.lastProcessedStocks);
    
    const currentData = dashboardState?.lastProcessedStocks || [];
    console.log("EXPORT -> Tatsächliche Länge:", currentData.length);
}
window.handleExportAction = handleExportAction;

// ------------------------------------------------------
// 2. Index, Search, Reset Events
// ------------------------------------------------------
document.addEventListener("dashboard:indexChange", (e) => {
    console.log("📌 dashboard.js: Event empfangen mit Wert:", e.detail);
    
    dashboardState.indexFilter = e.detail; 
    
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
    dashboardState.reset();
    filterStocksUI();
    renderAll();
});

// ------------------------------------------------------
// 3. Zentraler Click-Handler (Dropdowns, Pillen, Stocks, etc.)
// ------------------------------------------------------
document.addEventListener("click", (e) => {

    // 1) MID-SIGNALS: LONG / EXIT / PHASE
    const midItem = e.target.closest('.dropdown-item[data-phase-value]');
    if (midItem) {
        const type  = midItem.getAttribute('data-phase-type');
        const value = midItem.getAttribute('data-phase-value');

        if (!dashboardState.activeTypes) {
            dashboardState.activeTypes = { long: true, exit: true };
        }

        if (type === "long") {
            dashboardState.phaseLong = value;
            dashboardState.activeTypes.long = true; 
        }

        if (type === "exit") {
            dashboardState.phaseExit = value;
            dashboardState.activeTypes.exit = true;
        }

        document.querySelectorAll('.pill-dropdown-menu').forEach(m => {
            m.style.display = 'none';
            m.classList.remove('show');
        });

        const toolsTabContent = document.getElementById("tools-tab-content");
        renderActiveTab("signals", dashboardState, toolsTabContent);
        return;
    }

    // 2) DROPDOWN ÖFFNEN/SCHLIESSEN
    const pillWithDropdown = e.target.closest('.pill-dropdown-wrapper');
    if (pillWithDropdown) {
        const isTrigger = e.target.closest('.pill');
        if (isTrigger) {
            const menu = pillWithDropdown.querySelector('.pill-dropdown-menu');
            if (menu) {
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

    // 3) NORMALE PILLEN (Buy/Sell etc.)
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

    // 4) KLICK AUSSERHALB SCHLIESST DROPDOWNS
    if (!e.target.closest('.pill-dropdown-wrapper')) {
        document.querySelectorAll('.pill-dropdown-menu').forEach(m => {
            m.style.display = 'none';
            m.classList.remove('show');
        });
    }

    // 5) STOCK CLICK
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

    // 6) SECTOR CLICK
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

    // 7) INDUSTRY CLICK
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

    // 8) EXPORT TRADINGVIEW
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

// 9) BREADCRUMB CLICK HANDLER (Mit Toggle-Verhalten)
    const bcLink = e.target.closest('.bc-link');
    if (bcLink) {
        const bcType = bcLink.getAttribute('data-bc');

        if (bcType === 'reset') {
            document.dispatchEvent(new CustomEvent("dashboard:reset"));
            return;
        }

        if (bcType === 'sector') {
            const sectorVal = bcLink.getAttribute('data-sector');
            // Toggle: Wenn erneuert geklickt wird oder als Umschalter, Sektor auf null setzen wenn er es schon ist, sonst setzen
            dashboardState.sector = (dashboardState.sector === sectorVal) ? null : sectorVal;
            dashboardState.industry = null;
            dashboardState.ticker = null;
            filterStocksUI();
            renderAll();
            return;
        }

        if (bcType === 'industry') {
            const industryVal = bcLink.getAttribute('data-industry');
            // Toggle: Industrie abwählen, wenn sie es ist, andernfalls setzen und Ticker verwerfen
            dashboardState.industry = (dashboardState.industry === industryVal) ? null : industryVal;
            dashboardState.ticker = null;
            filterStocksUI();
            renderAll();
            return;
        }
    }
});

// ------------------------------------------------------
// 4. Days Filter Handler (Für das D-Dropdown)
// ------------------------------------------------------
export function handleDaysFilterChange(value) {
    // Direkt den importierten Modul-State nutzen!
    dashboardState.daysInTrend = (value === "" || value === null) ? null : Number(value);
    
    // Fallback/Synchronisation für window, falls nötig
    window.dashboardState = dashboardState;
    
    filterStocksUI();
    renderAll();
}
window.handleDaysFilterChange = handleDaysFilterChange;

// ------------------------------------------------------
// 5. Watchlist Interaktions-Stubs
// ------------------------------------------------------
window.handleWatchlistNote = function(id, ticker) {
    console.log(`[Stub] Notizen-Menü für ID ${id} (${ticker}) geklickt.`);
};

window.handleWatchlistOrder = function(id, ticker, strategy) {
    console.log(`[Stub] Order-Cart für ID ${id} (${ticker}) mit Strategie '${strategy}' geklickt.`);
};

window.handleWatchlistStrategySelect = function(id, currentStrategy) {
    console.log(`[Stub] Strategie-Auswahl für ID ${id} (Aktuell: '${currentStrategy}') geklickt.`);
};

window.handleWatchlistDelete = function(id) {
    console.log(`[Stub] Delete für ID ${id} geklickt.`);
};

// ------------------------------------------------------
// 6. Ready State
// ------------------------------------------------------
console.log("Dashboard NewStructure ready.");