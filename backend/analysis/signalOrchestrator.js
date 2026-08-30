/**
 * signalOrchestrator.js
 * ----------------------
 * Führt alle Signal-Engines zusammen und liefert ein einheitliches Objekt
 * für Dashboard- und Excel-Ansichten.
 */

const { getIndustrySignals } = require("./sparksignals/industrySignals");
const { getSectorSignals } = require("./sparksignals/sectorSignals");
const { getStockSignals } = require("./sparksignals/stockSignals");

// ⭐ NEU: StockLoader importieren
const { loadStockRawData } = require("./loadStockRawData");


/* ---------------------------------------------
   1. Sparkline-Signale (Industries, Sectors, Stocks)
---------------------------------------------- */

async function runSparklineSignals(rawExcelDatas) {
    const industrySignals = getIndustrySignals(rawExcelDatas);
    const sectorSignals = getSectorSignals(rawExcelDatas);

    // ⭐ NEU: StockLoader separat aufrufen
    const stockData = await loadStockRawData();

    // stockData.signals hat bereits das korrekte Format: { ticker: { signal: ... } }
    const stockSignals = stockData.signals;

    return {
        industries: industrySignals,
        sectors: sectorSignals,
        stocks: stockSignals
    };
}

/* ---------------------------------------------
   2. Alle Signale (Sparkline + spätere Erweiterungen)
---------------------------------------------- */

async function runAllSignals(rawExcelDatas) {
    const sparkline = await runSparklineSignals(rawExcelDatas);

    // Platzhalter für spätere Signal-Arten:
    const ranking = {};
    const rs = {};
    const strategies = {};
    const ml = {};

    return {
        sparkline,
        ranking,
        rs,
        strategies,
        ml
    };
}

/* ---------------------------------------------
   3. Exports
---------------------------------------------- */

module.exports = {
    runSparklineSignals,
    runAllSignals
};
