const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { tradingConnect } = require("../../db/connection");
const sql = require("mssql");

const INDEX_MAP = {
    "s&p 500": "SP500",
    "ndx": "NDX",
    "djia": "DJI",
    "rut": "RUT"
};

function parseIndexField(rawIndex) {
    if (!rawIndex || rawIndex.trim() === "" || rawIndex.trim() === "-") {
        return [];
    }
    return rawIndex
        .split(",")
        .map(x => x.trim().toLowerCase())
        .map(x => INDEX_MAP[x] ?? null)
        .filter(x => x !== null);
}

// 1. SCHREIB-FUNKTION (Berechnet per SQL und sichert als JSON)
async function generateAndSaveJsonCache() {
    const pool = await tradingConnect;
    const dateResult = await pool.request().query(`
        SELECT MAX(anl_datum) AS max_date 
        FROM marketScores WITH (NOLOCK)
        WHERE type = 'stock';
    `);
    
    const latestDate = dateResult.recordset[0]?.max_date;
    if (!latestDate) return 0;

    const request = pool.request();
    request.input("targetDate", sql.DateTime, latestDate);

    // Dein schwerer SQL-Query
    const query = `
WITH StockUniverse AS (
        SELECT DISTINCT ms.name AS ticker
        FROM marketScores ms WITH (NOLOCK)
        WHERE ms.type = 'stock' AND ms.anl_datum = @targetDate
    ),
    NumberedDays AS (
        SELECT 
            d.ticker, d.name, d.date, d.[open], d.[close], d.high, d.low, d.high52w,
            LAG(d.[close], 1) OVER (PARTITION BY d.ticker ORDER BY d.date) AS prev_close,
            LAG(d.[open], 1) OVER (PARTITION BY d.ticker ORDER BY d.date) AS prev_open,
            ROW_NUMBER() OVER (PARTITION BY d.ticker ORDER BY d.date) AS rn_asc
        FROM yahoo.dbo.DailyHistory d
        INNER JOIN StockUniverse su ON su.ticker = d.ticker
        WHERE d.date >= DATEADD(day, -365, @targetDate) -- Auf die letzten 365 Tage beschränken
    ),
    HighDays AS (
        SELECT 
            ticker, date AS high_date, rn_asc AS high_rn,
            LAG(rn_asc) OVER (PARTITION BY ticker ORDER BY rn_asc) AS prev_high_rn
        FROM NumberedDays
        WHERE high = high52w AND [close] > [open]
    ),
    ValidSetups AS (
        SELECT DISTINCT
            d_latest.ticker, d_latest.name, h.high_date,
            d_after.date AS gap_down_date, d_after.[close] AS gap_down_close,
            d_latest.date AS latest_date, d_latest.[open] AS latest_open, d_latest.[close] AS latest_close
        FROM HighDays h
        JOIN NumberedDays d_after ON d_after.ticker = h.ticker AND d_after.rn_asc = h.high_rn + 1
        JOIN NumberedDays d_latest ON d_latest.ticker = h.ticker AND d_latest.rn_asc = (SELECT MAX(rn_asc) FROM NumberedDays WHERE ticker = h.ticker)
        WHERE 
            (h.prev_high_rn IS NULL OR (h.high_rn - h.prev_high_rn) >= 5)
            AND d_after.[open] < d_after.prev_close
            AND d_after.[open] <= d_after.prev_open
            AND d_after.[close] < d_after.[open]
    )
SELECT 
        v.ticker, COALESCE(f.company, v.name) AS name, f.sector, f.industry,
        f.price, f.change, f.volume, f.[_52w_high] AS [52w_high], f.[index] AS finviz_index,
        v.high_date, v.gap_down_date, v.gap_down_close
    FROM ValidSetups v
    INNER JOIN finviz f WITH (NOLOCK) ON f.ticker = v.ticker AND f.anl_datum = @targetDate
    WHERE f.industry <> 'Shell Companies'
    ORDER BY v.gap_down_date DESC;
    `;

    const result = await request.query(query);
    const formattedData = result.recordset.map(row => ({
        ...row,
        index: parseIndexField(row.finviz_index)
    }));

    // In JSON-Datei schreiben
    const dirPath = path.join(__dirname, '../../data');
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    
    const filePath = path.join(dirPath, 'false_bo_cache.json');
    fs.writeFileSync(filePath, JSON.stringify(formattedData, null, 2), 'utf8');

    return formattedData.length;
}

// 2. API: Liefert blitzschnell die JSON-Datei für das Frontend
router.get('/false-bo', (req, res) => {
    try {
        const filePath = path.join(__dirname, '../../data/false_bo_cache.json');
        if (!fs.existsSync(filePath)) {
            return res.json([]);
        }
        const fileData = fs.readFileSync(filePath, 'utf8');
        res.json(JSON.parse(fileData));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. API: Manueller Trigger zum Berechnen & Neuschreiben der JSON (z.B. per Postman oder URL aufrufbar)
router.get('/false-bo/generate', async (req, res) => {
    try {
        const count = await generateAndSaveJsonCache();
        res.json({ success: true, message: `${count} Datensätze erfolgreich in die JSON-Cache-Datei geschrieben.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;