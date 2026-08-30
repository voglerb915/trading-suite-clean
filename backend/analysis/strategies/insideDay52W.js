const sql = require('mssql');
const logger = require('../../utils/logger');
const { config } = require('../../db/connection');

const insideDay52WLogic = {

    async getSignals() {
        try {
            const pool = await sql.connect(config);

            const res1 = await pool.request().query(`SELECT MAX([date]) AS lastDate FROM [yahoo].[dbo].[DailyHistory]`);
            const lastDate = res1.recordset[0].lastDate;
            if (!lastDate) return [];

            const res2 = await pool.request()
                .input('lastDate', sql.Date, lastDate)
                .query(`SELECT MAX([date]) AS prevDate FROM [yahoo].[dbo].[DailyHistory] WHERE [date] < @lastDate`);
            const prevDate = res2.recordset[0].prevDate;

            await this.maintenance(pool, lastDate);
            await this.scanForNewSignals(pool, lastDate, prevDate);

            return await this.getActiveSignalsFromDB(pool);

        } catch (err) {
            logger.error('S2_LOGIC', `Fehler in getSignals: ${err.message}`);
            throw err;
        }
    },

    async maintenance(pool, lastDate) {
        const q = `
            UPDATE s SET s.s2_setup_status = 'TRIGGERED'
            FROM [yahoo].[dbo].[strategies] s
            JOIN [yahoo].[dbo].[DailyHistory] h ON s.ticker = h.ticker
            WHERE s.s2_setup_status = 'ACTIVE' AND s.strategy_name = 'INSIDEDAY52W'
              AND h.[date] = @lastDate
              AND h.high > s.s2_high_vortag;

            UPDATE s SET s.s2_setup_status = 'FAILED'
            FROM [yahoo].[dbo].[strategies] s
            JOIN [yahoo].[dbo].[DailyHistory] h ON s.ticker = h.ticker
            WHERE s.s2_setup_status = 'ACTIVE' AND s.strategy_name = 'INSIDEDAY52W'
              AND h.[date] = @lastDate
              AND h.low < s.s2_anchor_low;
        `;
        await pool.request().input('lastDate', sql.Date, lastDate).query(q);
    },

    async scanForNewSignals(pool, lastDate, prevDate) {

        const q = `
            INSERT INTO [yahoo].[dbo].[strategies] 
            (ticker, strategy_name, s2_setup_status, s2_anchor_high, s2_anchor_low, 
             s2_high_vortag, s2_low_vortag, s2_tightness, [date]) 
            SELECT 
                h1.ticker, 'INSIDEDAY52W', 'ACTIVE', 
                h2.high, h2.low, h1.high, h1.low,
                ROUND(((h1.high - h1.low) / NULLIF(h2.high - h2.low, 0)) * 100, 2),
                h1.[date]
            FROM [yahoo].[dbo].[DailyHistory] h1
            JOIN [yahoo].[dbo].[DailyHistory] h2 
                ON h1.ticker = h2.ticker 
               AND h2.[date] = @prevDate
            
            INNER JOIN [yahoo].[dbo].[StockMetrics] sm
                ON h1.ticker = sm.ticker

            CROSS APPLY (
                SELECT TOP 1 industry
                FROM [trading].[dbo].[finviz] f
                WHERE f.ticker = h1.ticker
                ORDER BY f.anl_datum DESC
            ) f

            WHERE h1.[date] = @lastDate
              AND sm.vma_20 >= 250000 
              AND f.industry NOT IN ('Exchange Traded Fund', 'Shell Companies')
              AND h2.high >= h2.high52w
              AND h1.high < h2.high
              AND h1.low > h2.low
              AND NOT EXISTS (
                  SELECT 1 FROM [yahoo].[dbo].[strategies] s
                  WHERE s.ticker = h1.ticker 
                    AND s.strategy_name = 'INSIDEDAY52W'
                    AND s.s2_setup_status = 'ACTIVE'
              );
        `;

        await pool.request()
            .input('lastDate', sql.Date, lastDate)
            .input('prevDate', sql.Date, prevDate)
            .query(q);
    },

    async getActiveSignalsFromDB(pool) {
        const result = await pool.request().query(`
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
            SELECT * FROM RankedSignals 
            WHERE rn = 1
            ORDER BY s2_tightness ASC
        `);
        return result.recordset;
    }
};

module.exports = insideDay52WLogic;
