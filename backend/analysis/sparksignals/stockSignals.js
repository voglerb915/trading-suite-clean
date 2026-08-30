/**
 * stockSignals.js
 * -------------------
 * Erzeugt Sparkline-basierte Entry/Exit-Signale für alle Stocks.
 * Nutzt die BaseSignalEngine für die eigentliche Logik.
 */

const { getSparklineSignal } = require('./baseSignalEngine');

function getStockSignals(rawExcelDatas) {
    if (!rawExcelDatas || !rawExcelDatas.stocks) {
        console.warn("⚠️  Keine Stock-Daten in rawExcelDatas gefunden.");
        return {};
    }

    const stocks = rawExcelDatas.stocks;
    const result = {};

    for (const ticker of Object.keys(stocks)) {

        // 👉 NUR perf_week verwenden (wie bei Industries)
        const series = stocks[ticker].week.filter(v => v !== null);

        // Sparkline-Signal berechnen
        const signal = getSparklineSignal(series);

        result[ticker] = {
            signal: signal,        
            lastValue: series.at(-1) ?? null,
            seriesLength: series.length
        };
    }

    return result;
}

module.exports = {
    getStockSignals
};
