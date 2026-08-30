/**
 * industrySignals.js
 * -------------------
 * Erzeugt Sparkline-basierte Entry/Exit-Signale für alle Industries.
 * Nutzt die BaseSignalEngine für die eigentliche Logik.
 */

const { getSparklineSignal } = require('./baseSignalEngine');

function getIndustrySignals(rawExcelDatas) {
    if (!rawExcelDatas || !rawExcelDatas.industries) {
        console.warn("⚠️  Keine Industry-Daten in rawExcelDatas gefunden.");
        return {};
    }

    const industries = rawExcelDatas.industries;
    const result = {};

    for (const industryName of Object.keys(industries)) {

        // 👉 NUR perf_week verwenden
        const series = industries[industryName].week.filter(v => v !== null);

        // Sparkline-Signal berechnen
        const signal = getSparklineSignal(series);

        result[industryName] = {
            signal: signal,        
            lastValue: series.at(-1) ?? null,
            seriesLength: series.length
        };
    }

    return result;
}

module.exports = {
    getIndustrySignals
};
