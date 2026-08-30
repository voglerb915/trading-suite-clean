// ======================================================
// CORE RENDERER - UI Rendering & Strategie-Merge
// ======================================================

import { dashboardState } from "./state.js";
import { renderDashboard } from "../js/structure/renderDashboard.js";
import { renderDashboardTools, renderActiveTab } from "../js/structure/renderDashboardTools.js";

// ------------------------------------------------------
// 1. RENDER ALL
// ------------------------------------------------------
export function renderAll() {
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
// 2. Strategy-Merge (lokal im Dashboard)
// ------------------------------------------------------
export function mergeStrategies(baseStocks, strategyItemsMap, selectedStrategies) {
    const merged = baseStocks.map(stock => {
        // Einheitliche Sicherung von days_in_trend / daysInTrend direkt beim Klonen
        const trendVal = stock.daysInTrend !== undefined ? stock.daysInTrend : stock.days_in_trend;
        return {
            ...stock,
            daysInTrend: trendVal,
            days_in_trend: trendVal
        };
    });

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

