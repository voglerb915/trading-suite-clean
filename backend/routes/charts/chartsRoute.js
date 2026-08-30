const express = require("express");
const router = express.Router();
const { tradingConnect } = require("../../db/connection");
const sql = require("mssql");

// 1. Endpoint für Scores, Sektor-Mapping & SMA21 (Industries)
router.get("/industry-scores", async (req, res) => {
    try {
        const pool = await tradingConnect;
        const query = `
            WITH IndustrySectorMapping AS (
                SELECT DISTINCT f.industry, f.sector
                FROM finviz f WITH (NOLOCK)
                WHERE f.industry IS NOT NULL AND f.sector IS NOT NULL
            ),
            RawData AS (
                SELECT 
                    ms.anl_datum,
                    ms.name AS industry,
                    ISNULL(ism.sector, 'Unknown') AS sector,
                    ms.score,
                    ms.rank_db
                FROM marketScores ms WITH (NOLOCK)
                LEFT JOIN IndustrySectorMapping ism ON ism.industry = ms.name
                WHERE ms.type = 'industry'
                  AND ms.anl_datum >= DATEADD(month, -3, GETDATE())
            )
            SELECT 
                anl_datum,
                industry,
                sector,
                score,
                rank_db,
                AVG(CAST(score AS FLOAT)) OVER (
                    PARTITION BY industry 
                    ORDER BY anl_datum 
                    ROWS BETWEEN 20 PRECEDING AND CURRENT ROW
                ) AS sma21
            FROM RawData
            ORDER BY anl_datum ASC, industry ASC;
        `;

        const result = await pool.request().query(query);
        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error("Fehler in /api/charts/industry-scores:", err);
        res.status(500).json({ error: "Fehler beim Laden der Industrie-Scores" });
    }
});

// 2. Endpoint für Industrie-Performance (finviz_groups mit perf_quart)
router.get("/industry-performance", async (req, res) => {
    try {
        const pool = await tradingConnect;
        const query = `
            SELECT 
                anl_datum,
                name AS industry,
                perf_quart AS performance
            FROM trading.dbo.finviz_groups WITH (NOLOCK)
            WHERE [group] = 'industry'
              AND anl_datum >= DATEADD(month, -3, GETDATE())
            ORDER BY anl_datum ASC, name ASC;
        `;

        const result = await pool.request().query(query);
        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error("Fehler in /api/charts/industry-performance:", err);
        res.status(500).json({ error: "Fehler beim Laden der Industrie-Performance" });
    }
});

// 3. Endpoint für Sektor-Scores
router.get("/sector-scores", async (req, res) => {
    try {
        const pool = await tradingConnect;
        const query = `
            SELECT 
                anl_datum,
                name AS sector,
                score,
                rank_db
            FROM marketScores WITH (NOLOCK)
            WHERE type = 'sector'
              AND anl_datum >= DATEADD(month, -3, GETDATE())
            ORDER BY anl_datum ASC, name ASC;
        `;

        const result = await pool.request().query(query);
        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error("Fehler in /api/charts/sector-scores:", err);
        res.status(500).json({ error: "Fehler beim Laden der Sektor-Scores" });
    }
});

// 4. Endpoint für Sektor-Performance (finviz_groups mit perf_quart)
router.get("/sector-performance", async (req, res) => {
    try {
        const pool = await tradingConnect;
        const query = `
            SELECT 
                anl_datum,
                name AS sector,
                perf_quart AS performance
            FROM trading.dbo.finviz_groups WITH (NOLOCK)
            WHERE [group] = 'sector'
              AND anl_datum >= DATEADD(month, -3, GETDATE())
            ORDER BY anl_datum ASC, name ASC;
        `;

        const result = await pool.request().query(query);
        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error("Fehler in /api/charts/sector-performance:", err);
        res.status(500).json({ error: "Fehler beim Laden der Sektor-Performance" });
    }
});

module.exports = router;