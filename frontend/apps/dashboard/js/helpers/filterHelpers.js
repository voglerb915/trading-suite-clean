// Zentraler Signal-Filter für Sectors, Industries, Stocks
export function passesSignalFilter(signalObj, entryFlag, exitFlag) {
    const sig = signalObj?.signal;

    if (!sig) return (!entryFlag && !exitFlag);
    if (!entryFlag && !exitFlag) return true;
    if (sig === "entry" && entryFlag) return true;
    if (sig === "exit" && exitFlag) return true;

    return false;
}
// Neue Funktion speziell für den Signals-Tab mit 4 Filtern
export function passesMultiSignalFilter(ticker, state) {
    const spark = window.dataStore?.sparkSignals?.stocks?.[ticker];
    const mid = window.dataStore?.midTermSignals?.stocks?.[ticker];

    // Korrigierte Namen gemäß dashboardState
    const isNoFilterActive = !state.filterEntryStocks && !state.filterExitStocks && 
                             !state.filterMidLong && !state.filterMidExit;

    if (isNoFilterActive) return true;

    // Logik: Zeige, wenn EINE der aktiven Bedingungen erfüllt ist
    if (state.filterEntryStocks && spark?.signal === 'entry') return true;
    if (state.filterExitStocks && spark?.signal === 'exit') return true;
    if (state.filterMidLong && mid?.signal === 'long') return true;
    if (state.filterMidExit && mid?.signal === 'exit') return true;

    return false;
}
    