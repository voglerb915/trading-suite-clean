import { renderDashboardHeaderLeft } from "../header/renderDashboardHeaderLeft.js";
import { renderDashboardHeaderCenter } from "../header/renderDashboardHeaderCenter.js";
import { renderDashboardHeaderRight } from "../header/renderDashboardHeaderRight.js";

import { renderDashboardSectors } from "./renderDashboardSectors.js";
import { renderDashboardIndustries } from "./renderDashboardIndustries.js";
import { renderDashboardStocks } from "./renderDashboardStocks.js";
import { renderDashboardTools } from "./renderDashboardTools.js";

export function renderDashboard(state) {

    // ⭐ GLOBALEN STATE AKTUALISIEREN
    // Wir stellen sicher, dass die Stocks immer aus dem aktuellen Orchestrator-State kommen
    const liveState = {
        ...state,
        stocks: state.stocks

    };

    window.dashboardState = liveState;

    // ⭐ HEADER AKTUALISIEREN
    renderDashboardHeaderCenter(liveState);
    renderDashboardHeaderLeft(liveState);
    renderDashboardHeaderRight(liveState);

    // =====================================================
    // 1) SECTORS
    // =====================================================
    renderDashboardSectors(liveState.sectors, liveState);

    // =====================================================
    // 2) INDUSTRIES
    // =====================================================
    const industriesFiltered = liveState.sector
        ? liveState.industries.filter(ind => ind.sector === liveState.sector)
        : liveState.industries;

    renderDashboardIndustries(industriesFiltered, liveState);

    // =====================================================
    // 3) STOCKS
    // =====================================================
    // ❗ WICHTIG: Keine Filter mehr im Dashboard!
    // Cockpit liefert bereits gefilterte + sortierte Stocks.
    renderDashboardStocks(liveState.stocks, liveState);

    // =====================================================
    // 4) TOOLS
    // =====================================================
    renderDashboardTools(liveState);
}