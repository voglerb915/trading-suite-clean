// ======================================================
// CORE FILTER LOGIC - Filterung und Strategie-Umschaltung
// ======================================================

import { dashboardState } from "./state.js";
import { strategyEngine } from "../js/strategies/strategyEngine.js";
import { mergeStrategies, renderAll } from "./renderer.js";
import { fetchStrategyData } from "./api.js"; // <--- Hinzufügen

// ------------------------------------------------------
// 1. Lokale Filterlogik
// ------------------------------------------------------
export function filterStocksUI() {
    let filtered = [...dashboardState.stocks];

    if (dashboardState.sector && dashboardState.sector !== "all") {
        filtered = filtered.filter(s =>
            (s.sector || s.sector_name) === dashboardState.sector
        );
    }

    if (dashboardState.industry) {
        filtered = filtered.filter(s =>
            (s.industry || s.industry_name) === dashboardState.industry
        );
    }

    if (dashboardState.indexFilter && dashboardState.indexFilter !== "all") {
        filtered = filtered.filter(s => {
            const idxVal = s.index || s.finviz_index;
            if (Array.isArray(idxVal)) {
                return idxVal.includes(dashboardState.indexFilter);
            }
            return idxVal === dashboardState.indexFilter;
        });
    }

    if (dashboardState.search && dashboardState.search.length > 0) {
        const q = dashboardState.search.toLowerCase();
        filtered = filtered.filter(s =>
            s.ticker?.toLowerCase().includes(q) ||
            s.name?.toLowerCase().includes(q)
        );
    }

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
// In handleStrategyChange (core/filterLogic.js) anpassen:

export async function handleStrategyChange(e) {
    const selectedStrategy = e.detail;
    dashboardState.strategy = selectedStrategy;

    console.log("📌 StrategyChange:", selectedStrategy);

    // Wenn "none", einfach Original wiederherstellen
    if (selectedStrategy === "none") {
        dashboardState.stocks = [...dashboardState.stocksOriginal];
        filterStocksUI();
        return;
    }

    try {
        // Strategie-Daten laden
        const backendItems =
            await fetchStrategyData(selectedStrategy) ||
            dashboardState.strategyItems?.[selectedStrategy] ||
            [];

        console.log("🟦 DEBUG 1 → backendItems LENGTH:", backendItems.length);
        console.log("🟦 DEBUG 1a → backendItems SAMPLE:", backendItems[0]);

        if (backendItems.length === 0) {
            console.warn("⚠️ Keine Backend-Items für Strategie:", selectedStrategy);
            dashboardState.stocks = [];
            filterStocksUI();
            return;
        }

        // Backend-Map bauen
        const backendMap = new Map();
        backendItems.forEach(item => {
            if (item.ticker) {
                backendMap.set(item.ticker.trim().toUpperCase(), item);
            }
        });

        // Stocks gegen Backend matchen
        dashboardState.stocks = dashboardState.stocksOriginal
            .map(s => {
                const key = s.ticker ? s.ticker.trim().toUpperCase() : "";
                if (backendMap.has(key)) {
                    const backendItem = backendMap.get(key);
                    return {
                        ...s,
                        ...backendItem,
                        score:
                            backendItem._52w_high !== undefined
                                ? backendItem._52w_high
                                : (backendItem.score !== undefined
                                    ? backendItem.score
                                    : s.score)
                    };
                }
                return null;
            })
            .filter(Boolean);

        console.log("🟩 DEBUG 2 → stocks LENGTH nach Strategy:", dashboardState.stocks.length);
        console.log("🟩 DEBUG 2a → stocks SAMPLE:", dashboardState.stocks[0]);

        // ⭐⭐⭐ SignalsList über BACKEND-ITEMS filtern ⭐⭐⭐
        console.log("🟧 DEBUG 3 → signalsOriginal LENGTH:", dashboardState.signalsOriginal?.length);
        console.log("🟧 DEBUG 3a → signalsOriginal SAMPLE:", dashboardState.signalsOriginal?.[0]);

        if (dashboardState.signalsOriginal) {

            const allowedTickers = new Set(
                backendItems.map(b => b.ticker.trim().toUpperCase())
            );

            console.log("🟪 DEBUG 4 → allowedTickers SIZE:", allowedTickers.size);
            console.log("🟪 DEBUG 4a → allowedTickers SAMPLE:", [...allowedTickers][0]);

            dashboardState.signals = dashboardState.signalsOriginal.filter(sig =>
                allowedTickers.has(sig.ticker.trim().toUpperCase())
            );

            console.log("🟥 DEBUG 5 → signals LENGTH nach Filter:", dashboardState.signals.length);
            console.log("🟥 DEBUG 5a → signals SAMPLE:", dashboardState.signals[0]);

        } else {
            console.log("❌ DEBUG → signalsOriginal ist NULL/undefined");
            dashboardState.signals = [];
        }

        // Stocks filtern + rendern
        filterStocksUI();

    } catch (err) {
        console.error("Fehler beim Laden der Strategie:", err);
    }
}




document.addEventListener("dashboard:strategyChange", handleStrategyChange);