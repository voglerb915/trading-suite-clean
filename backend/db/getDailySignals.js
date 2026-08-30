/*1. getDailySignals.js
→ liefert die Rohdaten aus MSSQL

2. prepareSignals.js
→ importiert getDailySignals()  
→ merged DailySignals + Stocks
→ gibt fertige Signalobjekte zurück

3. signalsRoute.js
→ importiert prepareSignals()  
→ liefert fertige Signale an den Client */

// db/getDailySignals.js

const { sql, config } = require('./connection');
const logger = require('../utils/logger');

async function getDailySignals() {
    try {
        const pool = await sql.connect(config);

        const signalQuery = `
            SELECT 
                ticker,                          -- geliefert als signal.ticker
                date,                            -- geliefert als signal.date
                signal_type,                     -- geliefert als signal.signal_type
                phase_stock,                     -- geliefert als signal.phase_stock
                days_in_trend,                   -- geliefert als signal.days_in_trend
                rs_slow,                         -- geliefert als signal.rs_slow
                CASE 
                    WHEN phase_stock = '3' THEN 'green'
                    WHEN phase_stock = '6' THEN 'red'
                    WHEN phase_stock IN ('2', '4') THEN 'yellow'
                    WHEN phase_stock IN ('1', '5') THEN 'orange'
                    ELSE 'gray'
                END AS phase_color,              -- klein: phase_color
                DENSE_RANK() OVER (ORDER BY date DESC) AS signal_age_index -- klein: signal_age_index
            FROM [yahoo].[dbo].[DailySignals]
            WHERE 
                is_new_signal = 1 
                AND date IN ( 
                    SELECT DISTINCT TOP 5 date 
                    FROM [yahoo].[dbo].[DailySignals] 
                    ORDER BY date DESC
                )
            ORDER BY date DESC;
        `;

        const result = await pool.request().query(signalQuery);
        return result.recordset;

    } catch (err) {
        logger.error('SIGNALS-DB', `Fehler beim Laden der DailySignals: ${err.message}`);
        throw err;
    }
}

module.exports = { getDailySignals };