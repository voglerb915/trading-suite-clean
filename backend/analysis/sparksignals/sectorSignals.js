/**
 * sectorSignals.js
 * -------------------
 * Erzeugt Sparkline-basierte Entry/Exit-Signale für alle Sectors.
 * Nutzt die BaseSignalEngine für die eigentliche Logik.
 */

const { getSparklineSignal } = require('./baseSignalEngine');

function getSectorSignals(rawExcelDatas) {
    if (!rawExcelDatas || !rawExcelDatas.sectors) {
        console.warn("⚠️  Keine Sector-Daten in rawExcelDatas gefunden.");
        return {};
    }

    const sectors = rawExcelDatas.sectors;
    const result = {};

    for (const sectorName of Object.keys(sectors)) {

        // 👉 NUR perf_week verwenden (wie bei Industries & Stocks)
        const series = sectors[sectorName].week.filter(v => v !== null);

        // Sparkline-Signal berechnen
        const signal = getSparklineSignal(series);

        result[sectorName] = {
            signal: signal,
            lastValue: series.at(-1) ?? null,
            seriesLength: series.length
        };
    }

    return result;
}

module.exports = {
    getSectorSignals
};
