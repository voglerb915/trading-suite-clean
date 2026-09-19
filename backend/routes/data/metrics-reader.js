const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { config } = require('../../db/connection');

// --------------------------------------------------
// StockMetrics Reader
// Liefert die aktuellsten StockMetrics
// --------------------------------------------------

router.get('/', async (req, res) => {

    let pool;

    try {

        pool = await sql.connect(config);

        const result = await pool.request().query(`

            SELECT
                ticker,
                [date],

                atr_10,
                rvol,
                vma_20,
                vma_slope,

                sma200,

                consecutive_up_days,
                relative_candle_size,
                dist_52w_high_pct,

                last_updated

            FROM yahoo.dbo.StockMetrics

            WHERE [date] = (
                SELECT MAX([date])
                FROM yahoo.dbo.StockMetrics
            )

            ORDER BY ticker ASC

        `);

        res.json({
            ok: true,
            count: result.recordset.length,
            data: result.recordset
        });

    } catch (err) {

        console.error(
            `[STOCKMETRICS-READER] Fehler: ${err.message}`
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