const { yahooPool } = require("../../db/connection");

async function getInsideDayData() {
    console.log("InsideDay52W Service gestartet");

    try {
        const result = await yahooPool.request().query(`
            WITH RankedSignals AS (
                SELECT 
                    s.*, 
                    sm.vma_20,
                    ROW_NUMBER() OVER (PARTITION BY s.ticker ORDER BY s.[date] DESC) as rn
                FROM [yahoo].[dbo].[strategies] s
                LEFT JOIN [yahoo].[dbo].[StockMetrics] sm ON s.ticker = sm.ticker
                WHERE s.s2_setup_status = 'ACTIVE' 
                  AND s.strategy_name = 'INSIDEDAY52W'
            )
            SELECT 
                ticker,
                strategy_name,
                s2_setup_status,
                s2_anchor_high,
                s2_anchor_low,
                s2_high_vortag,
                s2_low_vortag,
                s2_tightness,
                [date],
                vma_20,
                s2_tightness AS strategyValue
            FROM RankedSignals 
            WHERE rn = 1
            ORDER BY s2_tightness ASC
        `);

        return result.recordset.map(r => ({
            ticker: r.ticker,
            strategyName: r.strategy_name,
            setupStatus: r.s2_setup_status,
            anchorHigh: r.s2_anchor_high,
            anchorLow: r.s2_anchor_low,
            highVortag: r.s2_high_vortag,
            lowVortag: r.s2_low_vortag,
            tightness: r.s2_tightness,
            date: r.date,
            vma_20: r.vma_20,
            strategyValue: r.s2_tightness
        }));

    } catch (err) {
        console.error("InsideDayService Fehler:", err);
        throw err;
    }
}

module.exports = { getInsideDayData };