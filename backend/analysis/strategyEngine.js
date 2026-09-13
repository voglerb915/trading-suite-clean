const { getStage3Data } = require("../routes/strategy/stage3toppingReader");
const { getInsideDayData } = require("../routes/strategy/insideDay52wReader");

async function runStrategy(strategyName, finvizRows) {
    if (!strategyName || strategyName === "none") {
        return finvizRows;
    }

    switch (strategyName) {
        case "high52w":
            return finvizRows.filter(row => 
                row._52w_high !== null && 
                row._52w_high >= 0 &&
                row.industry !== 'Exchange Traded Fund' &&
                row.industry !== 'Shell Companies'
            ).map(row => ({
                ...row,
                strategyValue: row._52w_high
            }));

        case "nearhigh52":
            return finvizRows.filter(row => 
                row._52w_high !== null && 
                row._52w_high >= -5 && 
                row._52w_high <= 0 &&
                row.industry !== 'Exchange Traded Fund' &&
                row.industry !== 'Shell Companies'
            ).map(row => ({
                ...row,
                strategyValue: row._52w_high
            }));

        case "insideday52w":
            return await getInsideDayData();

        case "stage3topping":
            return await getStage3Data();

        default:
            console.warn(`Strategie '${strategyName}' ist nicht implementiert.`);
            return [];
    }
}

module.exports = { runStrategy };