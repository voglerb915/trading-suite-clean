const { tradingPool } = require("../db/connection.js");
const sql = require("mssql");

// ⭐ Deine SignalEngine importieren
const { getSparklineSignal } = require("./sparksignals/baseSignalEngine");

async function loadStockRawData() {
    console.log("LOAD: Start optimierte Abfrage (Single Source of Truth: finviz)");

    // 1) SQL fragt nur noch finviz ab, gefiltert über eine Liste aus marketScores
    // Dadurch entfällt der fehleranfällige JOIN über Zeitstempel
    const query = `
        WITH RecentDates AS (
            SELECT DISTINCT TOP 25 CAST(anl_datum AS DATE) as pure_date
            FROM marketScores 
            WHERE type = 'stock' 
            ORDER BY CAST(anl_datum AS DATE) DESC
        )
        SELECT 
            f.ticker,
            f.anl_datum,
            ISNULL(f.perf_week, 0) as perf_week_value
        FROM finviz f WITH (NOLOCK)
        WHERE f.ticker IN (
            SELECT DISTINCT name FROM marketScores WHERE type = 'stock'
        )
        AND CAST(f.anl_datum AS DATE) IN (SELECT pure_date FROM RecentDates);
    `;

    try {
        const result = await tradingPool.request().query(query);
        
        // 2) Daten nach Ticker gruppieren
        const rawGrouped = {};
        result.recordset.forEach(row => {
            if (!rawGrouped[row.ticker]) {
                rawGrouped[row.ticker] = [];
            }
            rawGrouped[row.ticker].push({
                date: new Date(row.anl_datum).getTime(),
                val: Number(row.perf_week_value)
            });
        });

        // 3) Rechnersichere Sortierung
        const stocks = {};
        Object.entries(rawGrouped).forEach(([ticker, dataArray]) => {
            dataArray.sort((a, b) => b.date - a.date);
            
            stocks[ticker] = {
                week: dataArray.map(item => item.val)
            };
        });

        // 4) Signal-Berechnung
        const signals = {};
        let entryCount = 0;
        let exitCount = 0;
        let neutralCount = 0;

        Object.entries(stocks).forEach(([ticker, data]) => {
            const signal = getSparklineSignal(data.week); 
            signals[ticker] = { signal };

            if (signal === "entry") entryCount++;
            else if (signal === "exit") exitCount++;
            else neutralCount++;
        });

        console.log("SIGNALS GENERATED:", entryCount, exitCount, neutralCount);

        return { 
            success: true, 
            stocks,
            signals,
            summary: {
                total: Object.keys(stocks).length,
                entry: entryCount,
                exit: exitCount,
                neutral: neutralCount
            }
        };
    } catch (err) {
        console.error("SQL Error in loadStockRawData:", err);
        throw err;
    }
}

module.exports = { loadStockRawData };