const express = require("express");
const router = express.Router();
const { tradingPool, sql } = require("../../db/connection");
const { getSparklineSignal } = require("../../analysis/sparksignals/baseSignalEngine");

router.get("/write-spark-to-db", async (req, res) => {
    console.log(`🚀 [${new Date().toISOString()}] Spark Signals Writer gestartet.`);
    // Letztes verfügbares Datum aus marketScores holen
    const lastDateResult = await tradingPool.request().query(`
        SELECT MAX(CAST(anl_datum AS DATE)) AS lastDate
        FROM marketScores
    `);
    const lastDate = lastDateResult.recordset[0].lastDate;

    try {
        // 1. HINWEIS STATT ABBRUCH: Prüfen, ob für heute schon Daten existieren
        const check = await tradingPool.request()
            .input('lastDate', sql.Date, lastDate)
            .query(`
                SELECT COUNT(*) as count FROM marketScores 
                WHERE CAST(anl_datum AS DATE) = @lastDate
                AND signal_type IS NOT NULL AND signal_type <> ''
            `);

        if (check.recordset[0].count > 0) {
            console.log(`⚠️ Daten für den ${lastDate} existieren bereits – werden aufgrund des Neulaufs überschrieben.`);
        }

      
        // 2. DATEN ABFRAGEN
        // A) Stocks (aus finviz & marketScores)
        const stockResult = await tradingPool.request().query(`
            WITH RecentDates AS (
                SELECT DISTINCT TOP 25 CAST(anl_datum AS DATE) as pure_date 
                FROM marketScores WITH (NOLOCK) 
                WHERE type = 'stock' 
                ORDER BY pure_date DESC
            )
            SELECT f.ticker, f.anl_datum, ISNULL(f.perf_week, 0) as perf_week_value
            FROM finviz f WITH (NOLOCK) 
            INNER JOIN marketScores ms WITH (NOLOCK) ON f.ticker = ms.name AND f.anl_datum = ms.anl_datum
            WHERE ms.type = 'stock' AND CAST(f.anl_datum AS DATE) IN (SELECT pure_date FROM RecentDates)
        `);

        // B) Groups (Sectors & Industries aus finviz_groups)
        const groupsResult = await tradingPool.request().query(`
            WITH RecentDates AS (
                SELECT DISTINCT TOP 25 CAST(anl_datum AS DATE) as pure_date 
                FROM finviz_groups WITH (NOLOCK) 
                ORDER BY pure_date DESC
            )
            SELECT name, anl_datum, perf_week, [group]
            FROM finviz_groups WITH (NOLOCK)
            WHERE CAST(anl_datum AS DATE) IN (SELECT pure_date FROM RecentDates)
        `);

// 3. DATEN VERARBEITEN
        const processMap = (rows) => {
            const grouped = {};
            rows.forEach(row => {
                const key = row.ticker || row.name;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push({ date: new Date(row.anl_datum).getTime(), val: Number(row.perf_week_value ?? row.perf_week) });
            });
            
            const map = {};
            Object.entries(grouped).forEach(([key, arr]) => {
                arr.sort((a, b) => b.date - a.date);
                const series = arr.map(item => item.val);

                const last25 = series.slice(0, 25);

                map[key] = {
                    signal: getSparklineSignal(series),
                    min: Math.min(...last25),
                    max: Math.max(...last25),
                    len: series.length
                };
            }); // <-- Diese Klammer schließt Object.entries.forEach
            
            return map; // <-- Das muss innerhalb von processMap stehen!
        }; // <-- Diese Klammer schließt processMap


        const stockMap = processMap(stockResult.recordset);
        const sectorMap = processMap(groupsResult.recordset.filter(r => r.group === 'sector'));
        const industryMap = processMap(groupsResult.recordset.filter(r => r.group === 'industry'));

        // 4. SCHREIBEN (Funktion für alle Typen)
        const updateDb = async (map, type) => {
            for (const [name, data] of Object.entries(map)) {
                await tradingPool.request()
                    .input('st', sql.VarChar, data.signal)
                    .input('min', sql.Float, data.min)
                    .input('max', sql.Float, data.max)
                    .input('days', sql.Int, data.len)
                    .input('name', sql.VarChar, name)
                    .input('type', sql.VarChar, type)
                    .input('lastDate', sql.Date, lastDate)
                    .query(`
                        UPDATE marketScores 
                        SET signal_type = @st, min25 = @min, max25 = @max, signal_days = @days
                        WHERE name = @name 
                        AND type = @type
                        AND CAST(anl_datum AS DATE) = @lastDate
                    `);

            }
        };

        await updateDb(stockMap, 'stock');
        await updateDb(sectorMap, 'sector');
        await updateDb(industryMap, 'industry');

        res.json({ success: true, message: "Daten (Stocks, Sectors, Industries) erfolgreich geschrieben" });
        console.log(`✅ [${new Date().toISOString()}] Spark Signals Writer erfolgreich beendet.`);
    } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Fehler im Spark Signals Writer:`, error);
    }
});

module.exports = router;