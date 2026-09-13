import { passesSignalFilter } from "../../helpers/filterHelpersStocks.js";

export function filterSignals(stocks, state) {
    if (!stocks) return [];

    let filtered = [...stocks];

    // 1. Signal-Filter mit dem korrekten .stocks Pfad
    filtered = filtered.filter(stock => {
        const signalObj = window.dataStore?.sparkSignals?.stocks?.[stock.ticker] || stock;
        return passesSignalFilter(
            signalObj,
            state.filterBuySignals,
            state.filterSellSignals
        );
    });

    // 2. ⭐ GLOBALER DAYS_IN_TREND FILTER (Hier ergänzt, damit die Pille greift)
    if (state.daysInTrend !== null && state.daysInTrend !== undefined && state.daysInTrend !== "") {
        const minDays = Number(state.daysInTrend);
        filtered = filtered.filter(stock => {
            const val = stock.daysInTrend !== undefined ? stock.daysInTrend : stock.days_in_trend;
            return val !== null && val !== undefined && Number(val) >= minDays;
        });
    }

    if (!state.phaseLong) state.phaseLong = "all";
    if (!state.phaseExit) state.phaseExit = "all";

    const longVal = state.phaseLong;
    const exitVal = state.phaseExit;

    const longActive = longVal !== "all";
    const exitActive = exitVal !== "all";

    // 3. Phasen- und Typ-Filterung
    return filtered.filter(stock => {
        const isLong = stock.signal_type === 'LONG';
        const isExit = stock.signal_type === 'EXIT';

        // Gegenseitiges Unterdrücken
        if (longActive && isExit) return false;
        if (exitActive && isLong) return false;

        // Long Filterung
        if (isLong) {
            if (longVal === "all_long") return true;
            if (longVal !== "all") {
                return String(stock.phase_stock) === String(longVal);
            }
            return true;
        }

        // Exit Filterung
        if (isExit) {
            if (exitVal === "all_exit") return true;
            if (exitVal !== "all") {
                return String(stock.phase_stock) === String(exitVal);
            }
            return true;
        }

        return false;
    });
}