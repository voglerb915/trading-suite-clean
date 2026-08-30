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
                console.log("DASHBOARD INIT → STOCKS ORIGINAL LENGTH:", dashboardState.stocksOriginal.length);
                
                console.log("DASHBOARD INIT → STRATEGY ITEMS LENGTH:", dashboardState.strategyItems?.stage3topping?.length);

dashboardState.stocksOriginal = (msg.payload.stocks || []).map(s => {
    const trendVal = s.daysInTrend !== undefined ? s.daysInTrend : s.days_in_trend;
    return {
        ...s,
        daysInTrend: trendVal,
        days_in_trend: trendVal
    };
});

// 🔍 LOG 1: Direkt nach dem Empfang prüfen
console.log("🔍 [LOG 1 - API] StocksOriginal geladen. Länge:", dashboardState.stocksOriginal.length);
console.log("🔍 [LOG 1 - API] Beispiel-Aktie (erste):", dashboardState.stocksOriginal[0]?.ticker, "-> daysInTrend:", dashboardState.stocksOriginal[0]?.daysInTrend);
                // Nach dieser Zeile in INIT und COCKPIT_DATA einfügen:
dashboardState.stocks = dashboardState.stocksOriginal;

// --- AB HIER NEU: Globalen daysInTrend-Filter direkt beim Datenempfang anwenden ---
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

                const rawMid = msg.payload.midSignals || {};
                dashboardState.midSignals = {
                    latestDate: rawMid.latestDate || null,
                    totalCount: rawMid.totalCount || 0,
                    counts: rawMid.counts || {},
                    data: Array.isArray(rawMid.data) ? rawMid.data : []
                };

                const rawSpark = msg.payload.sparkSignals || {};
                dashboardState.sparkSignals = {
                    stocks: rawSpark.stocks || {},
                    sectors: rawSpark.sectors || {},
                    industries: rawSpark.industries || {}
                };

                window.dataStore = window.dataStore || {};
                window.dataStore.sparkSignals = dashboardState.sparkSignals;
                window.dataStore.midSignals = dashboardState.midSignals;

                console.log(
                    "DEBUG: SparkSignals im Dashboard:",
                    Object.keys(dashboardState.sparkSignals.stocks).length,
                    "Stocks"
                );
                renderAll();
                break;
            }

            case "COCKPIT_DATA": {
                console.log("Dashboard: COCKPIT_DATA empfangen:", msg.payload);
                console.log("DASHBOARD COCKPIT_DATA → STOCKS ORIGINAL LENGTH:", dashboardState.stocksOriginal.length);
                console.log("DASHBOARD COCKPIT_DATA → STRATEGY ITEMS LENGTH:", dashboardState.strategyItems?.stage3topping?.length);

                dashboardState.stocksOriginal = (msg.payload.stocks || []).map(s => {
                    const trendVal = s.daysInTrend !== undefined ? s.daysInTrend : s.days_in_trend;
                    return {
                        ...s,
                        daysInTrend: trendVal,
                        days_in_trend: trendVal
                    };
                });
                // Nach dieser Zeile in INIT und COCKPIT_DATA einfügen:
dashboardState.stocks = dashboardState.stocksOriginal;

// --- AB HIER NEU: Globalen daysInTrend-Filter direkt beim Datenempfang anwenden ---
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

                console.log("STOCK_DETAILS STATE REF:", dashboardState.referenceStock);
                renderDashboard(dashboardState);

                break;
            }

            case "SET_SECTOR": {
                const sectorName = msg.payload?.sectorName;
                console.log("🎯 Dashboard hat Sektor-Signal erhalten:", sectorName);

                if (!sectorName) break;

                // 1. Sektor im Dashboard-State speichern
                dashboardState.sector = sectorName;
                dashboardState.industry = ""; // Industrie zurücksetzen, damit kein alter Filter querchießt

                // 2. UI neu zeichnen lassen
                if (typeof renderAll === "function") {
                    renderAll();
                }
                break;
            }

case "SET_INDUSTRY":
            case "SELECT_INDUSTRY": {
                const industryName = msg.payload?.industryName;
                console.log("🎯 Dashboard hat Industrie-Signal erhalten für:", industryName);

                if (!industryName) break;

                // 1. Im Dashboard-State speichern
                dashboardState.industry = industryName;

                // 2. UI im Dashboard neu zeichnen lassen
                if (typeof renderAll === "function") {
                    renderAll();
                }

                break;
            }

            default:
                console.warn("Dashboard: Unbekannte Action ignoriert:", msg.action);
                return;
        }
    });
}


// --- ANTI-POWERSAVE / KEEP-ALIVE MECHANISMUS ---
function initKeepAliveAudio() {
    let audioCtx = null;

    function playSilentBeep() {
        try {
            // AudioContext erst bei User-Interaktion oder beim Start initialisieren
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                audioCtx = new AudioContext();
            }

            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            // Einen unhörbaren Oszillator (z.B. 20 Hz - außerhalb des menschlichen Hörbereichs) erzeugen
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 20; // 20 Hz (unhörbar)
            
            // Lautstärke auf absolut 0 setzen zur Sicherheit
            gainNode.gain.value = 0.0001; 

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                oscillator.disconnect();
            }, 100); // Läuft nur 100 Millisekunden

            console.log("Keep-Alive: Silent Audio Takt ausgeführt.");
        } catch (e) {
            console.warn("Keep-Alive Audio konnte nicht ausgeführt werden:", e);
        }
    }

    // Alle 45 Sekunden einen kurzen Takt senden, um den Tab wach zu halten
    setInterval(playSilentBeep, 45000);
}

// Direkt beim Laden des Dashboards aufrufen
document.addEventListener("DOMContentLoaded", () => {
    initKeepAliveAudio();
});