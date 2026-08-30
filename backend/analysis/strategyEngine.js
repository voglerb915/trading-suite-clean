// backend/analysis/strategyEngine.js

// Alle Strategien importieren
//const { strategy52wHigh } = require("./strategies/strategy52wHigh.js");



function runStrategy(strategyName, finvizRows) {
    if (!strategyName || strategyName === "none") {
        return [];
    }

    let strategyFn = null;

    switch (strategyName) {
        // case "52wHigh":
        //     strategyFn = strategy52wHigh;
        //     break;

        default:
            console.warn(`Strategie '${strategyName}' ist nicht implementiert.`);
            return [];
    }


    // Strategy bekommt NUR die Finviz-Rohdaten
    return strategyFn(finvizRows);
}

module.exports = { runStrategy };
