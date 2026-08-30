const express = require('express');
const router = express.Router();
const { sql, config } = require('../../db/connection'); // Pfad ggf. anpassen


router.get('/', async (req, res) => {
    try {
        const pool = await sql.connect(config);

        // 1. Hole alle relevanten Signale für den neuesten Tag in der DB
        // gefiltert auf days_in_trend <= 5 und Phasen 1-6
        const query = `
            SELECT 
                ticker,
                date,
                ref_index_symbol,
                signal_type,
                days_in_trend,
                phase_stock,
                phase_index,
                rs_slow,
                rs_fast,
                dist_sma200,
                CASE 
                    WHEN phase_stock = '3' THEN 'green'
                    WHEN phase_stock = '6' THEN 'red'
                    WHEN phase_stock IN ('2', '4') THEN 'yellow'
                    WHEN phase_stock IN ('1', '5') THEN 'orange'
                    ELSE 'gray'
                END AS phase_color
            FROM [yahoo].[dbo].[DailySignals]
            WHERE 
                date = (SELECT MAX(date) FROM [yahoo].[dbo].[DailySignals])
                AND days_in_trend <= 5
                AND phase_stock IN ('1', '2', '3', '4', '5', '6')
            ORDER BY date DESC, ticker ASC;
        `;

        const result = await pool.request().query(query);
        const signals = result.recordset;

        // 2. Berechne direkt die Zählungen für die Pillen (optional, aber extrem praktisch für das UI)
        const counts = {
            LONG: {},
            EXIT: {}
        };

        // Initialisiere Phasen 1-6 mit 0
        ['1', '2', '3', '4', '5', '6'].forEach(phase => {
            counts.LONG[phase] = 0;
            counts.EXIT[phase] = 0;
        });

        signals.forEach(sig => {
            if (counts[sig.signal_type] && counts[sig.signal_type][sig.phase_stock] !== undefined) {
                counts[sig.signal_type][sig.phase_stock]++;
            }
        });

        // 3. Sende die fertigen Daten an das Frontend
        res.json({
            success: true,
            latestDate: signals.length > 0 ? signals[0].date : null,
            totalCount: signals.length,
            counts: counts,
            data: signals
        });

    } catch (err) {
        logger.error('MID-SIGNALS', `Fehler beim Laden: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;