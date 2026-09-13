export function filterSignals(signals, state) {
    if (!Array.isArray(signals)) return [];

    const mid = state.mid;

    const sparkBuyActive  = state.filterBuySignals === true;
    const sparkSellActive = state.filterSellSignals === true;

    const daysActive = state.daysInTrend !== "" && state.daysInTrend != null;
    const minDays = Number(state.daysInTrend);

    const strategyActive = state.strategy && state.strategy !== "all" && state.strategy !== "none";

    return signals.filter(sig => {

        const type      = sig.signal_type;        // LONG / EXIT
        const phase     = String(sig.phase_stock);
        const sparkType = sig.spark?.signal;      // entry / exit

        //
        // ⭐ 1. SPARK FILTER
        //
        if (sparkBuyActive || sparkSellActive) {
            if (sparkBuyActive && sparkType !== "entry") return false;
            if (sparkSellActive && sparkType !== "exit")  return false;
        }

        //
        // ⭐ 2. STRATEGY FILTER (MUSS VOR MID!)
        //
        if (strategyActive) {
            const val = sig.strategyValue ?? sig.value ?? null;
            if (val == null) return false;
        }

        //
        // ⭐ 3. DAYS FILTER
        //
// ⭐ 3. DAYS FILTER
if (daysActive) {
    const d = Number(sig.days_in_trend);
    if (isNaN(d) || d < minDays) return false;
}

        //
        // ⭐ 4. MID FILTER (JETZT ERST!)
        //
        if (mid.long.active) {
            if (type !== "LONG") return false;
            if (mid.long.mode === "all") return true;
            return phase === mid.long.mode;
        }

        if (mid.exit.active) {
            if (type !== "EXIT") return false;
            if (mid.exit.mode === "all") return true;
            return phase === mid.exit.mode;
        }

        //
        // ⭐ 5. Default
        //
        return true;
    });
}
