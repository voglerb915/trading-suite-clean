const express = require('express');
const router = express.Router();
const { yahooPool } = require('../../db/connection');


router.post('/', async (req, res) => {
    try {
        const { tickers } = req.body; 
        
        if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
            return res.status(400).json({ error: "tickers array missing or empty in body" });
        }

        const pool = await yahooPool;
        const request = pool.request();

        // Saubere Formatierung der Ticker für ein SQL IN-Statement
        const formattedTickers = tickers.map(t => `'${t.replace(/'/g, "''").trim()}'`).join(',');

        const query = `
            SELECT h.ticker, h.[date], h.[open], h.[high], h.[low], h.[close]
            FROM [yahoo].[dbo].[DailyHistory] h
            WHERE h.ticker IN (${formattedTickers})
              AND h.[date] = (
                  SELECT MAX(h2.[date]) 
                  FROM [yahoo].[dbo].[DailyHistory] h2 
                  WHERE h2.ticker = h.ticker
              );
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error("Backend DailyHistory SQL Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;