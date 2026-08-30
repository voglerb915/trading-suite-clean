// backend/routes/strategies/insideDay52wWriter.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { config } = require('../../db/connection');
const insideDay52WLogic = require('../../analysis/strategies/insideDay52W');

router.get('/insideDay52wWriter', async (req, res) => {
    try {
        const pool = await sql.connect(config);

        // 1) Letzten Tag holen
        const lastDateResult = await pool.request().query(`
            SELECT MAX(date) AS lastDate FROM yahoo.dbo.DailyHistory
        `);

        const lastDateRaw = lastDateResult.recordset[0].lastDate;

        if (!lastDateRaw) {
            return res.status(500).json({ error: "Kein lastDate in DailyHistory gefunden." });
        }

        // SQL-kompatibles Format erzeugen
        const lastDate = lastDateRaw.toISOString().split('T')[0];

        // 2) Vortag holen
        const prevDateResult = await pool.request().query(`
            SELECT MAX(date) AS prevDate 
            FROM yahoo.dbo.DailyHistory 
            WHERE date < '${lastDate}'
        `);

        const prevDateRaw = prevDateResult.recordset[0].prevDate;

        if (!prevDateRaw) {
            return res.status(500).json({ error: "Kein prevDate in DailyHistory gefunden." });
        }

        const prevDate = prevDateRaw.toISOString().split('T')[0];

        // 3) maintenance → TRIGGERED / FAILED setzen
        await insideDay52WLogic.maintenance(pool, lastDate);

        // 4) neue Signale erzeugen
        await insideDay52WLogic.scanForNewSignals(pool, lastDate, prevDate);

        res.json({ status: "InsideDay52W Writer OK", lastDate, prevDate });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
