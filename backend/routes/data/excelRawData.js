const express = require('express');
const router = express.Router();

const { sql, tradingPool } = require('../../db/connection.js');
// ⬇️ Mapping importieren
const { getSectorForIndustry } = require("../../utils/industrySectorMap.js");

// GET /api/excel/rawdata
router.get('/rawdata', async (req, res) => {
    try {
        // 1) Letzte 25 Tage holen / alternativ 200 (egal ob sector oder industry)
        // Immer nur die letzten 25 Tage holen
        const datesResult = await tradingPool.request().query(`
            SELECT DISTINCT TOP 25
                CONVERT(VARCHAR(10), anl_datum, 23) AS anl_datum
            FROM trading.dbo.finviz_groups
            ORDER BY anl_datum DESC
        `);


        const dates = datesResult.recordset.map(r => r.anl_datum);

        // 2) Alle relevanten Daten für diese Tage holen
        const dataResult = await tradingPool.request().query(`
            SELECT
                [group],
                name,
                perf_week,
                perf_month,
                perf_quart,
                CONVERT(VARCHAR(10), anl_datum, 23) AS anl_datum
            FROM trading.dbo.finviz_groups
            WHERE CONVERT(VARCHAR(10), anl_datum, 23) IN (${dates.map(d => `'${d}'`).join(",")})
            ORDER BY anl_datum DESC, name ASC
        `);

        const rows = dataResult.recordset;

        // 3) Pivot-Struktur für sectors + industries
        const sectors = {};
        const industries = {};

        const groups = {
            sector: sectors,
            industry: industries
        };

        // Alle Namen pro Gruppe extrahieren
        const namesByGroup = {
            sector: [...new Set(rows.filter(r => r.group === "sector").map(r => r.name))],
            industry: [...new Set(rows.filter(r => r.group === "industry").map(r => r.name))]
        };

        // Pivot für beide Gruppen
        ["sector", "industry"].forEach(g => {
            namesByGroup[g].forEach(name => {
                groups[g][name] = { week: [], month: [], quarter: [] };

                dates.forEach(date => {
                    const row = rows.find(r => r.group === g && r.name === name && r.anl_datum === date);

                    groups[g][name].week.push(row ? row.perf_week : null);
                    groups[g][name].month.push(row ? row.perf_month : null);
                    groups[g][name].quarter.push(row ? row.perf_quart : null);
                });
            });
        });

        // ⬇️ HIER: Industries mit Sector anreichern
        Object.keys(industries).forEach(ind => {
            industries[ind].sector = getSectorForIndustry(ind);
        });

        return res.json({
            success: true,
            dates,
            sectors,
            industries
        });


    } catch (err) {
        console.error("DB-Fehler:", err);
        return res.status(500).json({
            success: false,
            error: "Serverfehler"
        });
    }
});

module.exports = router;
