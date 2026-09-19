const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { config } = require('../../db/connection');

router.post('/', async (req, res) => {

    const start = Date.now();
    let pool;

    try {

        pool = await sql.connect(config);

        console.log('[METRICS] Starte Berechnung der Metriken...');

        const calcQuery = `
            SELECT
                h.ticker,
                CAST(h.[date] AS DATE) AS [date],

                stats.vma20,
                stats.atr10,
                stats.sma200,

                CASE
                    WHEN stats.vma20 > 0
                    THEN ROUND(CAST(h.volume AS FLOAT) / stats.vma20, 2)
                    ELSE 0
                END AS rvol,

                ROUND(
                    ((h.[close] - h.low) / NULLIF(h.high - h.low, 0)) * 100,
                    2
                ) AS rel_candle,

                ROUND(
                    ((h.[close] - h.high52w) / NULLIF(h.high52w, 0)) * 100,
                    2
                ) AS dist_high

            FROM yahoo.dbo.DailyHistory h

            OUTER APPLY (

                SELECT

                    AVG(CAST(volume AS FLOAT)) AS vma20,

                    AVG(CAST(high - low AS FLOAT)) AS atr10,

(
    SELECT AVG(CAST([close] AS FLOAT))
    FROM (
        SELECT TOP 200 [close]
        FROM yahoo.dbo.DailyHistory h3
        WHERE h3.ticker = h.ticker
          AND CAST(h3.[date] AS DATE)
              <= CAST(h.[date] AS DATE)
        ORDER BY h3.[date] DESC
    ) smaSub
) AS sma200

                FROM (

                    SELECT TOP 20
                        volume,
                        high,
                        low
                    FROM yahoo.dbo.DailyHistory h2
                    WHERE h2.ticker = h.ticker
                      AND CAST(h2.[date] AS DATE)
                          <= CAST(h.[date] AS DATE)
                    ORDER BY h2.[date] DESC

                ) volSub

            ) stats

            WHERE CAST(h.[date] AS DATE) = (
                SELECT CAST(MAX([date]) AS DATE)
                FROM yahoo.dbo.DailyHistory
            )

            OPTION (RECOMPILE)
        `;

        const calcResult = await pool.request().query(calcQuery);

        const newData = calcResult.recordset;

        console.log(
            `[METRICS] Berechnete Zeilen: ${newData.length}`
        );

        if (newData.length === 0) {

            return res.json({
                ok: true,
                message: 'Keine neuen Daten gefunden.',
                duration: Date.now() - start
            });

        }

        console.log(
            '[METRICS] Lösche alte StockMetrics-Zeilen...'
        );

        const latestDate = newData[0].date;

        await pool.request()
            .input('latestDate', sql.Date, latestDate)
            .query(`
                DELETE FROM yahoo.dbo.StockMetrics
                WHERE [date] = @latestDate
            `);

        const table = new sql.Table('yahoo.dbo.StockMetrics');

        table.create = false;

        table.columns.add(
            'ticker',
            sql.VarChar(20),
            { nullable: false }
        );

        table.columns.add(
            'date',
            sql.Date,
            { nullable: false }
        );

        table.columns.add(
            'atr_10',
            sql.Float,
            { nullable: true }
        );

        table.columns.add(
            'rvol',
            sql.Float,
            { nullable: true }
        );

        table.columns.add(
            'vma_20',
            sql.Float,
            { nullable: true }
        );

        table.columns.add(
            'vma_slope',
            sql.Float,
            { nullable: true }
        );

        table.columns.add(
            'consecutive_up_days',
            sql.Int,
            { nullable: true }
        );

        table.columns.add(
            'relative_candle_size',
            sql.Float,
            { nullable: true }
        );

        table.columns.add(
            'dist_52w_high_pct',
            sql.Float,
            { nullable: true }
        );

        table.columns.add(
            'sma200',
            sql.Float,
            { nullable: true }
        );

        table.columns.add(
            'last_updated',
            sql.DateTime,
            { nullable: true }
        );

        const now = new Date();

        for (const row of newData) {

            table.rows.add(
                row.ticker,
                row.date,

                row.atr10,
                row.rvol,
                row.vma20,

                null,          // vma_slope
                null,          // consecutive_up_days

                row.rel_candle,
                row.dist_high,

                row.sma200,

                now
            );

        }

        console.log(
            `[METRICS] Starte Bulk-Insert mit ${newData.length} Zeilen...`
        );

        await pool.request().bulk(table);

        console.log(
            `[METRICS] Bulk-Insert erfolgreich: ${newData.length} Zeilen eingefügt.`
        );

        res.json({
            ok: true,
            message:
                `Metriken erfolgreich berechnet und ${newData.length} Zeilen gespeichert.`,
            duration: Date.now() - start
        });

    } catch (err) {

        console.error(
            `[METRICS] Fehler beim Update: ${err.message}`
        );

        res.status(500).json({
            ok: false,
            error: err.message
        });

    } finally {

        if (pool) {
            await pool.close();
        }

    }

});

module.exports = router;