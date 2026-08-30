const express = require("express");
const router = express.Router();
const { sql, yahooPool } = require("../../db/connection");

// ------------------------------------------------------
//  /api/indexhistory  →  liefert ALLE Indizes + bis zu 70 Tage History
// ------------------------------------------------------
router.get("/", async (req, res) => {
    try {
        const result = await yahooPool.request().query(`
            SELECT 
                i.index_id,
                i.index_name,
                i.ticker,
                c.country_name,
                r.region_name,
                h.date,
                h.[close],
                h.adj_close,
                h.[open],
                h.high,
                h.low,
                h.volume
            FROM indices i
            LEFT JOIN countries c ON c.country_id = i.country_id
            LEFT JOIN regions r ON r.region_id = c.region_id
            LEFT JOIN IndexHistory h ON h.index_id = i.index_id
            ORDER BY i.index_id, h.date DESC;
        `);   //  <-- HIER fehlte die schließende Backtick-Klammer UND die runde Klammer

        const grouped = {};

        for (const row of result.recordset) {
            if (!grouped[row.index_id]) {
                grouped[row.index_id] = {
                    index_id: row.index_id,
                    index_name: row.index_name,
                    ticker: row.ticker,
                    country: row.country_name,
                    region: row.region_name,
                    history: []
                };
            }

            if (row.date && grouped[row.index_id].history.length < 70) {
                grouped[row.index_id].history.push({
                    date: row.date,
                    close: row.close,
                    adj_close: row.adj_close,
                    open: row.open,
                    high: row.high,
                    low: row.low,
                    volume: row.volume
                });
            }
        }

        res.json(Object.values(grouped));
    } catch (err) {
        console.error("IndexHistory-Fehler:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
