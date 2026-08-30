// frontend/apps/dashboard/js/helpers/renderHelpers.js

import { sectorClasses } from "../../../../shared/logic/sectorColors.js";

import {
  handleSectorSelection,
  handleIndustrySelection,
  handleStockSelection
} from "../../../../shared/logic/selectionHandlers.js";

import { renderDashboard } from "../structure/renderDashboard.js";

// ⭐ FEHLENDE IMPORTS (entscheidend!)
import { renderDashboardHeaderLeft } from "../header/renderDashboardHeaderLeft.js";
import { renderDashboardHeaderCenter } from "../header/renderDashboardHeaderCenter.js";
import { renderDashboardHeaderRight } from "../header/renderDashboardHeaderRight.js";

// ---------------------------------------------------------
//  UI Helper
// ---------------------------------------------------------
export function getSectorClass(name) {
  return sectorClasses[name] ?? "sector-default";
}

export function getDiffColor(value) {
  if (value == null) return "#999";
  if (value > 0) return "#4caf50";
  if (value < 0) return "#f44336";
  return "#999";
}

export function formatDiff(value) {
  if (value == null) return "—";
  const num = Number(value);
  if (isNaN(num)) return "—";
  if (num > 0) return `+${num}`;
  if (num < 0) return `${num}`;
  return "0";
}

export function renderRankCircle(rank, signalObj) {
    const sig = signalObj?.signal;

    // ⭐ Wenn KEIN Signal: Nutze die gleiche Klasse, aber mit neutralem Style
    if (!sig) {
        return `<span class="rank-pill rank-empty">${rank ?? "—"}</span>`;
    }

    // ⭐ Wenn Signal: Entry / Exit
    let cls = sig === "entry" ? "rank-entry" : "rank-exit";

    return `<span class="rank-pill ${cls}">${rank ?? "—"}</span>`;
}

export function renderTrendBars(days) {
    const numDays = Math.min(Math.max(Number(days) || 1, 1), 5);
    let html = '<span class="trend-strength-bars" title="Days in Trend: ' + numDays + '">';
    for (let i = 1; i <= 5; i++) {
        // Bei Tag 1 sind alle aktiv (i <= 5). Bei Tag 2 nur noch i <= 4 usw.
        const activeClass = i <= (6 - numDays) ? ' active' : '';
        html += `<span class="trend-bar${activeClass}"></span>`;
    }
    html += '</span>';
    return html;
}

// ---------------------------------------------------------
//  CLICK HANDLER: SECTOR
// ---------------------------------------------------------
export function handleSectorClick(sectorName) {
  const currentState = window.dashboardState;
  const newState = handleSectorSelection(currentState, sectorName);

  // ⭐ Breadcrumbs setzen
  newState.breadcrumbs = newState.sector ?? "Alle Sektoren";

  window.dashboardState = newState;
  renderDashboard(newState);
}

// ---------------------------------------------------------
//  CLICK HANDLER: INDUSTRY
// ---------------------------------------------------------
export function handleIndustryClick(industryName, sectorName) {
  const currentState = window.dashboardState;
  const newState = handleIndustrySelection(currentState, industryName, sectorName);

  // ⭐ Breadcrumbs setzen
  if (!newState.sector) {
    newState.breadcrumbs = "Alle Sektoren";
  } else if (!newState.industry) {
    newState.breadcrumbs = newState.sector;
  } else {
    newState.breadcrumbs = `${newState.sector} › ${newState.industry}`;
  }

  window.dashboardState = newState;
  renderDashboard(newState);
}

// ---------------------------------------------------------
//  CLICK HANDLER: STOCK
// ---------------------------------------------------------
export function handleStockClick(ticker, industry, sector) {
  const currentState = window.dashboardState;

  // 1) Vollständiges Stock-Objekt finden
  const item = currentState.stocks?.find(s => s.ticker === ticker);

  // Wenn nicht gefunden → Klick abbrechen
  if (!item) {
    console.warn("Stock not found:", ticker);
    return;
  }

  // 2) referenceStock setzen
  currentState.referenceStock = item;

  // 3) State aktualisieren
  const newState = handleStockSelection(currentState, { ticker, industry, sector });

  // 4) Breadcrumbs setzen
  newState.breadcrumbs = `${newState.sector} › ${newState.industry} › ${newState.ticker}`;

  // 5) State speichern
  window.dashboardState = newState;

  // 6) HeaderLeft aktualisieren
  renderDashboardHeaderLeft(newState);

  // 7) Dashboard neu rendern
  renderDashboard(newState);
}

// --- GLOBAL BINDINGS FÜR INLINE ONCLICK ---
window.handleSectorClick = handleSectorClick;
window.handleIndustryClick = handleIndustryClick;
window.handleStockClick = handleStockClick;
