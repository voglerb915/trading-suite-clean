const { tradingPool } = require("../db/connection.js");
const sql = require("mssql");
const { getSparklineSignal } = require("./sparksignals/baseSignalEngine");

async function loadStockRawData() {
    console.log("LOAD: Starte Validierung und Datenabfrage...");

    // 1. CONTROL-CENTER-CHECK: Gibt es Datumsabweichungen zwischen marketScores und finviz?
    const checkQuery = `
        WITH MS_Dates AS (
            SELECT DISTINCT TOP 25 CAST(anl_datum AS DATE) as m_date
            FROM marketScores WITH (NOLOCK)
            WHERE type = 'stock'
            ORDER BY CAST(anl_datum AS DATE) DESC
        ),
        FV_Dates AS (
            SELECT DISTINCT TOP 25 CAST(anl_datum AS DATE) as f_date
            FROM finviz WITH (NOLOCK)
            ORDER BY CAST(anl_datum AS DATE) DESC
        )
        -- Zeige alle Tage, die in der einen, aber nicht in der anderen Tabelle sind
        SELECT 'Nur in marketScores' as Problem, m_date as Datum FROM MS_Dates WHERE m_date NOT IN (SELECT f_date FROM FV_Dates)
        UNION ALL
        SELECT 'Nur in finviz' as Problem, f_date as Datum FROM FV_Dates WHERE f_date NOT IN (SELECT m_date FROM MS_Dates);
    `;

    const checkResult = await tradingPool.request().query(checkQuery);

    if (checkResult.recordset.length > 0) {
        console.error("❌ CONTROL-CENTER-ALARM: Datumsabweichung zwischen Tabellen erkannt!");
        console.table(checkResult.recordset); // Gibt eine schöne Tabelle im Terminal aus
        
        // Wir brechen hier ab, damit keine falschen Signale berechnet werden
        return {
            success: false,
            error: "DATABASES_ASYNC",
            message: "marketScores und finviz sind nicht synchron. Bitte Daten bereinigen.",
            details: checkResult.recordset
        };
    }

    // 2. Wenn alles synchron ist, läuft die normale Abfrage (sture Top 25 aus marketScores)
    const query = `
        WITH RecentDates AS (
            SELECT DISTINCT TOP 25 CAST(anl_datum AS DATE) as pure_date
            FROM marketScores WITH (NOLOCK)
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
    
    // 3. Daten nach Ticker gruppieren
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

    // 4. Sortierung in JavaScript
    const stocks = {};
    Object.entries(rawGrouped).forEach(([ticker, dataArray]) => {
        dataArray.sort((a, b) => b.date - a.date);
        stocks[ticker] = {
            week: dataArray.map(item => item.val)
        };
    });

    // 5. SignalEngine ausführen
    const signals = {};
    let entryCount = 0; let exitCount = 0; let neutralCount = 0;

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
}

module.exports = { loadStockRawData };