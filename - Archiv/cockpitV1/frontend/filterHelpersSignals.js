export function passesMultiSignalFilter(ticker, state) {

    const spark = window.dataStore?.sparkSignals?.stocks?.[ticker] || null;
    const mid   = window.dataStore?.midSignals?.stocks?.[ticker] || null;

    // Spark LONG
    if (state.filterEntryStocks) {
        if (!spark || spark.signal_type !== "LONG") return false;
    }

    // Spark EXIT
    if (state.filterExitStocks) {
        if (!spark || spark.signal_type !== "EXIT") return false;
    }

    // Midterm LONG
    if (state.filterMidLong) {
        if (!mid || mid.signal_type !== "LONG") return false;
    }

    // Midterm EXIT
    if (state.filterMidExit) {
        if (!mid || mid.signal_type !== "EXIT") return false;
    }

    // Wenn keine Filter aktiv → alles durchlassen
    if (
        !state.filterEntryStocks &&
        !state.filterExitStocks &&
        !state.filterMidLong &&
        !state.filterMidExit
    ) {
        return true;
    }

    return true;
}
