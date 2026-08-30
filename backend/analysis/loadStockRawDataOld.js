const { tradingPool } = require("../db/connection.js");
const sql = require("mssql");

// ⭐ Deine SignalEngine importieren
const { getSparklineSignal } = require("./sparksignals/baseSignalEngine");

async function loadStockRawData() {
    console.log("LOAD: Start optimierte Abfrage (Plattformunabhängig & Sortiersicher)");

    // 1) SQL liefert saubere Einzelzeilen der letzten 25 Handelstage
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
        INNER JOIN marketScores ms WITH (NOLOCK) 
            ON f.ticker = ms.name AND f.anl_datum = ms.anl_datum
        WHERE ms.type = 'stock'
          AND CAST(f.anl_datum AS DATE) IN (SELECT pure_date FROM RecentDates);
    `;

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

    // 3) Rechnersichere Sortierung in JavaScript (Strikt absteigend: [neu, ..., alt])
    const stocks = {};
    Object.entries(rawGrouped).forEach(([ticker, dataArray]) => {
        // Sortiert plattformübergreifend exakt nach Millisekunden
        dataArray.sort((a, b) => b.date - a.date);
        
        stocks[ticker] = {
            week: dataArray.map(item => item.val)
        };
    });
// DIAGNOSE-BLOCK FÜR KOPN UND APH
if (stocks['KOPN']) {
    console.log("--- DIAGNOSE LAPTOP vs DESKTOP ---");
    console.log("KOPN Array Länge:", stocks['KOPN'].week.length);
    console.log("KOPN Erste 3 Werte (neu):", stocks['KOPN'].week.slice(0, 3));
    console.log("KOPN Letzte 3 Werte (alt):", stocks['KOPN'].week.slice(-3));
}
if (stocks['APH']) {
    console.log("APH Erste 3 Werte (neu):", stocks['APH'].week.slice(0, 3));
}
    // ⭐ 4) HIER kommt die SignalEngine rein
    const signals = {};
    let entryCount = 0;
    let exitCount = 0;
    let neutralCount = 0;

    Object.entries(stocks).forEach(([ticker, data]) => {
        const signal = getSparklineSignal(data.week); // deine Engine
        signals[ticker] = { signal };

        if (signal === "entry") entryCount++;
        else if (signal === "exit") exitCount++;
        else neutralCount++;
    });

    // Ausgabe im Backend-Terminal zur Kontrolle
    console.log("SIGNALS GENERATED:", entryCount, exitCount, neutralCount);

    // ⭐ 5) Response erweitern
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
}

module.exports = { loadStockRawData };