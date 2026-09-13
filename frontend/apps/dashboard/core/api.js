// ======================================================
// CORE API - Backend Kommunikation & Response Handling
// ======================================================

import { dashboardState } from "./state.js";
import { strategyEngine } from "../js/strategies/strategyEngine.js";
import { renderAll } from "./renderer.js";
import { renderDashboard } from "../js/structure/renderDashboard.js";

// ------------------------------------------------------
// 1. Hilfsfunktion: Industry Map erzeugen
// ------------------------------------------------------
export function buildIndustryMap(industries) {
    const map = new Map();
    industries.forEach(ind => {
        map.set(ind.industry, ind.rank);
    });

    const totalInd = industries.length;
    return { map, totalInd };
}

// ------------------------------------------------------
// 1. Hilfsfunktion: Backend-Strategien aufrufen mit Hilfsfunktion
// ------------------------------------------------------
export async function fetchStrategyData(strategyName) {
    try {
        const response = await fetch(`/api/strategy/${strategyName}`);
        const result = await response.json();
        return result.data || [];
    } catch (err) {
        console.error(`Fehler beim Laden der Strategie ${strategyName}:`, err);
        return [];
    }
}

// ------------------------------------------------------
// 2. REQUEST SENDER
// ------------------------------------------------------
let initSent = false;

export function requestInit() {
    if (initSent) return;
    initSent = true;

    window.parent.postMessage({
        type: "REQUEST",
        action: "INIT",
        payload: {}
    }, "*");
}

export function sendRequest(action, payload) {
    window.parent.postMessage({
        type: "REQUEST",
        action,
        payload
    }, "*");
}

// ------------------------------------------------------
// 3. RESPONSE HANDLER
// ------------------------------------------------------
export function initResponseListener() {
    window.addEventListener("message", (event) => {
        console.log("RAW MESSAGE:", event.data);

        const msg = event.data;
        if (!msg || msg.type !== "RESPONSE") {
            return;
        }

        switch (msg.action) {

            case "INIT": {
                console.log("INIT empfangen:", msg.payload);

                dashboardState.stocksOriginal = (msg.payload.stocks || []).map(s => {
                    const trendVal = s.daysInTrend !== undefined ? s.daysInTrend : s.days_in_trend;
                    return {
                        ...s,
                        daysInTrend: trendVal,
                        days_in_trend: trendVal
                    };
                });

                dashboardState.stocks = dashboardState.stocksOriginal;

                // --- daysInTrend Filter ---
                if (dashboardState.daysInTrend !== null && dashboardState.daysInTrend !== undefined && dashboardState.daysInTrend !== "") {
                    const minDays = Number(dashboardState.daysInTrend);
                    dashboardState.stocks = dashboardState.stocks.filter(s => {
                        const val = s.daysInTrend !== undefined ? s.daysInTrend : s.days_in_trend;
                        return val !== null && val !== undefined && Number(val) >= minDays;
                    });
                }

                const fn = strategyEngine[dashboardState.strategy];
                if (fn) {
                    dashboardState.stocks = fn(dashboardState.stocksOriginal);
                }

                dashboardState.sectors = msg.payload.sectors || [];
                dashboardState.industries = msg.payload.industries || [];
                dashboardState.etfs = msg.payload.etfs || [];

                const { map, totalInd } = buildIndustryMap(dashboardState.industries);
                dashboardState.industryMap = map;
                dashboardState.totalInd = totalInd;

                dashboardState.strategyItems = msg.payload.strategyItems || {};

                // --- MID SIGNALS ---
                const rawMid = msg.payload.midSignals || {};
                dashboardState.midSignals = {
                    latestDate: rawMid.latestDate || null,
                    totalCount: rawMid.totalCount || 0,
                    counts: rawMid.counts || {},
                    data: Array.isArray(rawMid.data) ? rawMid.data : []
                };

                // --- SPARK SIGNALS ---
                const rawSpark = msg.payload.sparkSignals || {};
                dashboardState.sparkSignals = {
                    stocks: rawSpark.stocks || {},
                    sectors: rawSpark.sectors || {},
                    industries: rawSpark.industries || {}
                };

                window.dataStore = window.dataStore || {};
                window.dataStore.sparkSignals = dashboardState.sparkSignals;
                window.dataStore.midSignals = dashboardState.midSignals;

                // ⭐⭐⭐ WICHTIG: SignalsList initialisieren ⭐⭐⭐
                dashboardState.signalsOriginal = dashboardState.midSignals.data || [];
                dashboardState.signals = dashboardState.signalsOriginal;

                renderAll();
                break;
            }

            case "COCKPIT_DATA": {
                dashboardState.stocksOriginal = (msg.payload.stocks || []).map(s => {
                    const trendVal = s.daysInTrend !== undefined ? s.daysInTrend : s.days_in_trend;
                    return {
                        ...s,
                        daysInTrend: trendVal,
                        days_in_trend: trendVal
                    };
                });

                dashboardState.stocks = dashboardState.stocksOriginal;

                if (dashboardState.daysInTrend !== null && dashboardState.daysInTrend !== undefined && dashboardState.daysInTrend !== "") {
                    const minDays = Number(dashboardState.daysInTrend);
                    dashboardState.stocks = dashboardState.stocks.filter(s => {
                        const val = s.daysInTrend !== undefined ? s.daysInTrend : s.days_in_trend;
                        return val !== null && val !== undefined && Number(val) >= minDays;
                    });
                }

                dashboardState.sectors = msg.payload.sectors || [];
                dashboardState.industries = msg.payload.industries || [];
                dashboardState.etfs = msg.payload.etfs || [];

                const { map, totalInd } = buildIndustryMap(dashboardState.industries);
                dashboardState.industryMap = map;
                dashboardState.totalInd = totalInd;

                const rawMid2 = msg.payload.midSignals || {};
                dashboardState.midSignals = {
                    latestDate: rawMid2.latestDate || null,
                    totalCount: rawMid2.totalCount || 0,
                    counts: rawMid2.counts || {},
                    data: Array.isArray(rawMid2.data) ? rawMid2.data : []
                };

                const rawSpark2 = msg.payload.sparkSignals || {};
                dashboardState.sparkSignals = {
                    stocks: rawSpark2.stocks || {},
                    sectors: rawSpark2.sectors || {},
                    industries: rawSpark2.industries || {}
                };

                window.dataStore = window.dataStore || {};
                window.dataStore.midSignals = dashboardState.midSignals;

                // ⭐⭐⭐ WICHTIG: SignalsList initialisieren ⭐⭐⭐
                dashboardState.signalsOriginal = dashboardState.midSignals.data || [];
                dashboardState.signals = dashboardState.signalsOriginal;

                renderAll();
                break;
            }

            case "STOCK_DETAILS": {
                dashboardState.ticker = msg.payload.ticker;
                dashboardState.sector = msg.payload.stock.sector || msg.payload.stock.sector_name;
                dashboardState.industry = msg.payload.stock.industry || msg.payload.stock.industry_name;
                dashboardState.referenceStock = msg.payload.stock;

                window.dataStore = window.dataStore || {};
                window.dataStore.referenceStock = msg.payload.stock;

                renderDashboard(dashboardState);
                break;
            }

            case "SET_SECTOR": {
                const sectorName = msg.payload?.sectorName;
                if (!sectorName) break;

                dashboardState.sector = sectorName;
                dashboardState.industry = "";

                renderAll();
                break;
            }

            case "SET_INDUSTRY":
            case "SELECT_INDUSTRY": {
                const industryName = msg.payload?.industryName;
                const sectorName = msg.payload?.sectorName;

                if (!industryName) break;

                dashboardState.industry = industryName;
                if (sectorName) {
                    dashboardState.sector = sectorName;
                }

                renderAll();
                break;
            }

            default:
                console.warn("Dashboard: Unbekannte Action ignoriert:", msg.action);
                return;
        }
    });
}
