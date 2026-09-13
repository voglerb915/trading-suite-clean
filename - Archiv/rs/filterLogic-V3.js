// ======================================================
// CORE FILTER LOGIC - Filterung und Strategie-Umschaltung
// ======================================================

import { dashboardState } from "./state.js";
import { strategyEngine } from "../js/strategies/strategyEngine.js";
import { mergeStrategies, renderAll } from "./renderer.js";

// ------------------------------------------------------
// 1. Lokale Filterlogik
// ------------------------------------------------------
export function filterStocksUI() {
    let filtered = [...dashboardState.stocksOriginal];

    console.log("DEBUG: Filter startet. Strategie:", dashboardState.strategy, "Index:", dashboardState.indexFilter);

    // 1) Strategy-Filter
    if (dashboardState.strategy && dashboardState.strategy !== "none") {

        // A) FRONTEND-Strategien
        const frontendFn = strategyEngine[dashboardState.strategy];
        if (frontendFn) {
            filtered = frontendFn(filtered);
        }

// B) BACKEND-Strategien
        else {
            // Wir müssen hier zwingend das Merging auf die Basisdaten anwenden, 
            // damit stock.strategy als Array befüllt wird!
            filtered = mergeStrategies(
                filtered,
                dashboardState.strategyItems,
                [dashboardState.strategy]
            );

            filtered = filtered.filter(s => {
                const strategySource = s.strategy || [];
                return Array.isArray(strategySource) && strategySource.includes(dashboardState.strategy);
            });
        }
    }

    // 2) Sector
    if (dashboardState.sector && dashboardState.sector !== "all") {
        filtered = filtered.filter(s =>
            (s.sector || s.sector_name) === dashboardState.sector
        );
    }

    // 3) Industry
    if (dashboardState.industry) {
        filtered = filtered.filter(s =>
            (s.industry || s.industry_name) === dashboardState.industry
        );
    }

    // 4) Index (Sicherer Abgleich für Arrays und Strings)
    if (dashboardState.indexFilter && dashboardState.indexFilter !== "all") {
        filtered = filtered.filter(s => {
            const idxVal = s.index || s.finviz_index;
            if (Array.isArray(idxVal)) {
                return idxVal.includes(dashboardState.indexFilter);
            }
            return idxVal === dashboardState.indexFilter;
        });
    }

    // 5) Search
    if (dashboardState.search && dashboardState.search.length > 0) {
        const q = dashboardState.search.toLowerCase();
        filtered = filtered.filter(s =>
            s.ticker?.toLowerCase().includes(q) ||
            s.name?.toLowerCase().includes(q)
        );
    }

    // Ergebnis im globalen State speichern
    dashboardState.stocks = filtered;
    console.log("DEBUG Filter - Finales Ergebnis:", filtered.length);

    if (typeof renderAll === "function") {
        renderAll();
    }
}

window.filterStocksUI = filterStocksUI;

// ------------------------------------------------------
// 2. StrategyChange Handler
// ------------------------------------------------------
export function handleStrategyChange(e) {
    const selectedStrategy = e.detail;
    dashboardState.strategy = selectedStrategy;

    console.log("📌 StrategyChange:", selectedStrategy);

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

        filtered = frontendFn(filtered);
        dashboardState.stocks = filtered;

        filterStocksUI();
        renderAll();
        return;
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