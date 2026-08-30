const express = require('express');
const router = express.Router();
const { sql, config } = require('../db/connection');
const { getSectorMomentum } = require('../services/sectorsService'); 

// 1. Spezifische Route ZUERST definieren!
router.get('/momentum', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 5; 
        const momentumData = await getSectorMomentum(days);
        res.json(momentumData);
    } catch (err) {
        console.error("Fehler in /api/market-scores/momentum:", err);
        res.status(500).json({ error: 'Serverfehler beim Laden des Momentums' });
    }
});

// 2. Allgemeine Route DANACH
router.get('/', async (req, res) => {
    try {
        const { type, date } = req.query;

        let query = `
            SELECT *
            FROM trading.dbo.marketScores
            WHERE 1 = 1
        `;

        if (type) {
            query += ` AND type = @type `;
        }

        if (date) {
            query += ` AND CAST(anl_datum AS date) = @date `;
        }

        query += ` ORDER BY anl_datum DESC, rank_db ASC `;

        const pool = await sql.connect(config);
        const request = pool.request();

        if (type) request.input('type', sql.VarChar, type);
        if (date) request.input('date', sql.Date, date);

        const result = await request.query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error('❌ Fehler in /api/market-scores:', err);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

module.exports = router;