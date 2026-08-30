const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { config } = require('../../db/connection');

// -----------------------------------------------------------------
// 1. LESE-ROUTE: Aktuelle StockMetrics abrufen (z.B. für das Frontend)
// -----------------------------------------------------------------
router.get('/', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(config);
        
        // Holt standardmäßig die Daten des jüngsten Datums aus der Tabelle
        const query = `
            SELECT TOP 1000 
                ticker, 
                [date], 
                atr_10, 
                rvol, 
                vma_20, 
                vma_slope, 
                consecutive_up_days, 
                relative_candle_size, 
                dist_52w_high_pct, 
                last_updated
            FROM [yahoo].[dbo].[StockMetrics]
            WHERE [date] = (SELECT MAX([date]) FROM [yahoo].[dbo].[StockMetrics])
            ORDER BY ticker ASC;
        `;

        const result = await pool.request().query(query);

        res.json({
            ok: true,
            count: result.recordset.length,
            data: result.recordset
        });

    } catch (err) {
        res.status(500).json({
            ok: false,
            error: err.message
        });
    } finally {
        if (pool) await pool.close();
    }
});

// -----------------------------------------------------------------
// 2. SCHREIB- / BERECHNUNGS-ROUTE: Metriken berechnen und Bulk-Insert
// -----------------------------------------------------------------
router.post('/', async (req, res) => {
    const start = Date.now();
    let pool;

    try {
        pool = await sql.connect(config);
        console.log('[METRICS] Starte Berechnung der Metriken...');

        const dateCheck = await pool.request().query("SELECT MAX([date]) as maxD FROM yahoo.dbo.DailyHistory");
        console.log(`[METRICS] SQL sagt, das Max-Datum ist: ${dateCheck.recordset[0].maxD}`);

        // 1. Daten berechnen mit CAST auf DATE
        const calcQuery = `
            SELECT 
                h.ticker, 
                h.[date], 
                stats.vma20, 
                stats.atr10,
                CASE WHEN stats.vma20 > 0 THEN ROUND(CAST(h.volume AS FLOAT) / stats.vma20, 2) ELSE 0 END as rvol,
                ROUND(((h.[close] - h.low) / NULLIF(h.high - h.low, 0)) * 100, 2) as rel_candle,
                ROUND(((h.[close] - h.high52w) / NULLIF(h.high52w, 0)) * 100, 2) as dist_high
            FROM [yahoo].[dbo].[DailyHistory] h
            OUTER APPLY (
                SELECT 
                    AVG(CAST(volume AS FLOAT)) as vma20, 
                    AVG(high - low) as atr10
                FROM (
                    SELECT TOP 20 volume, high, low
                    FROM [yahoo].[dbo].[DailyHistory] h2
                    WHERE h2.ticker = h.ticker 
                      AND CAST(h2.[date] AS DATE) <= CAST(h.[date] AS DATE)
                    ORDER BY h2.[date] DESC
                ) AS sub
            ) stats
            WHERE CAST(h.[date] AS DATE) = (
                SELECT CAST(MAX([date]) AS DATE) 
                FROM yahoo.dbo.DailyHistory
            )
            OPTION (RECOMPILE)
        `;

        const calcResult = await pool.request().query(calcQuery);
        const newData = calcResult.recordset;
        console.log(`[METRICS] Berechnete Zeilen: ${newData.length}`);

        if (newData.length === 0) {
            return res.json({
                ok: true,
                message: "Keine neuen Daten zum Berechnen gefunden.",
                duration: Date.now() - start
            });
        }

        // 2. Alte Daten löschen
        console.log('[METRICS] Lösche alte StockMetrics-Zeilen...');
        await pool.request().query(`
            DELETE FROM [yahoo].[dbo].[StockMetrics]
            WHERE [date] >= (SELECT DATEADD(day, -7, MAX([date])) FROM yahoo.dbo.DailyHistory)
        `);

        // 3. Bulk-Tabelle vorbereiten
        console.log('[METRICS] Bereite Bulk-Tabelle vor...');
        const table = new sql.Table('yahoo.dbo.StockMetrics');
        table.create = false;

        table.columns.add('ticker', sql.VarChar(20), { nullable: false });
        table.columns.add('date', sql.Date, { nullable: false });
        table.columns.add('atr_10', sql.Float, { nullable: true });
        table.columns.add('rvol', sql.Float, { nullable: true });
        table.columns.add('vma_20', sql.Float, { nullable: true });
        table.columns.add('vma_slope', sql.Float, { nullable: true });
        table.columns.add('consecutive_up_days', sql.Int, { nullable: true });
        table.columns.add('relative_candle_size', sql.Float, { nullable: true });
        table.columns.add('dist_52w_high_pct', sql.Float, { nullable: true });
        table.columns.add('last_updated', sql.DateTime, { nullable: true });

        const now = new Date();

        for (const row of newData) {
            table.rows.add(
                row.ticker,
                row.date,
                row.atr10,
                row.rvol,
                row.vma20,
                null,
                null,
                row.rel_candle,
                row.dist_high,
                now
            );
        }

        console.log(`[METRICS] Starte Bulk-Insert mit ${newData.length} Zeilen...`);
        await pool.request().bulk(table);
        console.log(`[METRICS] Bulk-Insert erfolgreich: ${newData.length} Zeilen eingefügt.`);

        const duration = Date.now() - start;

        res.json({
            ok: true,
            message: `Metriken erfolgreich berechnet und ${newData.length} Zeilen gespeichert.`,
            duration
        });

    } catch (err) {
        console.error(`[METRICS] Fehler beim Update: ${err.message}`);
        res.status(500).json({
            ok: false,
            error: err.message
        });
    } finally {
        if (pool) await pool.close();
    }
});

module.exports = router;