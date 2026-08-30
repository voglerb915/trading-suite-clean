const express = require("express");
const router = express.Router();

const { tradingPool } = require("../../db/connection");
const { getSparklineSignal } = require("../../analysis/sparksignals/baseSignalEngine");

router.get("/", async (req, res) => {
    try {
        //
        // 1) STOCKS – Zeitreihe (TOP 25 Tage)
        //
        const stockQuery = `
            WITH RecentDates AS (
                SELECT DISTINCT TOP 25 CAST(anl_datum AS DATE) as pure_date
                FROM marketScores WITH (NOLOCK)
                WHERE type = 'stock'
                ORDER BY pure_date DESC
            )
            SELECT 
                f.ticker,
                f.anl_datum,
                ISNULL(f.perf_week, 0) as perf_week_value
            FROM finviz f WITH (NOLOCK)
            INNER JOIN marketScores ms WITH (NOLOCK) 
                ON f.ticker = ms.name AND f.anl_datum = ms.anl_datum
            WHERE ms.type = 'stock'
              AND CAST(f.anl_datum AS DATE) IN (SELECT pure_date FROM RecentDates);
        `;

        const stockResult = await tradingPool.request().query(stockQuery);

        const groupedStocks = {};
        stockResult.recordset.forEach(row => {
            if (!groupedStocks[row.ticker]) groupedStocks[row.ticker] = [];
            groupedStocks[row.ticker].push({
                date: new Date(row.anl_datum).getTime(),
                val: Number(row.perf_week_value)
            });
        });

        const stockMap = {};
        Object.entries(groupedStocks).forEach(([ticker, arr]) => {
            arr.sort((a, b) => b.date - a.date);
            const series = arr.map(item => item.val);

            stockMap[ticker] = {
                signal: getSparklineSignal(series),
                lastValue: series.at(-1) ?? null,
                seriesLength: series.length,
                series
            };
        });

        //
        // 2) SECTORS – Zeitreihe (TOP 25 Tage)
        //
        const sectorQuery = `
            WITH RecentDates AS (
                SELECT DISTINCT TOP 25 CAST(anl_datum AS DATE) as pure_date
                FROM finviz_groups WITH (NOLOCK)
                WHERE [group] = 'sector'
                ORDER BY pure_date DESC
            )
            SELECT 
                name,
                anl_datum,
                perf_week
            FROM finviz_groups WITH (NOLOCK)
            WHERE [group] = 'sector'
              AND CAST(anl_datum AS DATE) IN (SELECT pure_date FROM RecentDates);
        `;

        const sectorResult = await tradingPool.request().query(sectorQuery);

        const groupedSectors = {};
        sectorResult.recordset.forEach(row => {
            if (!groupedSectors[row.name]) groupedSectors[row.name] = [];
            groupedSectors[row.name].push({
                date: new Date(row.anl_datum).getTime(),
                val: Number(row.perf_week)
            });
        });

        const sectorMap = {};
        Object.entries(groupedSectors).forEach(([name, arr]) => {
            arr.sort((a, b) => b.date - a.date);
            const series = arr.map(item => item.val);

            sectorMap[name] = {
                signal: getSparklineSignal(series),
                lastValue: series.at(-1),
                seriesLength: series.length,
                series
            };
        });

        //
        // 3) INDUSTRIES – Zeitreihe (TOP 25 Tage)
        //
        const industryQuery = `
            WITH RecentDates AS (
                SELECT DISTINCT TOP 25 CAST(anl_datum AS DATE) as pure_date
                FROM finviz_groups WITH (NOLOCK)
                WHERE [group] = 'industry'
                ORDER BY pure_date DESC
            )
            SELECT 
                name,
                anl_datum,
                perf_week
            FROM finviz_groups WITH (NOLOCK)
            WHERE [group] = 'industry'
              AND CAST(anl_datum AS DATE) IN (SELECT pure_date FROM RecentDates);
        `;

        const industryResult = await tradingPool.request().query(industryQuery);

        const groupedIndustries = {};
        industryResult.recordset.forEach(row => {
            if (!groupedIndustries[row.name]) groupedIndustries[row.name] = [];
            groupedIndustries[row.name].push({
                date: new Date(row.anl_datum).getTime(),
                val: Number(row.perf_week)
            });
        });

        const industryMap = {};
        Object.entries(groupedIndustries).forEach(([name, arr]) => {
            arr.sort((a, b) => b.date - a.date);
            const series = arr.map(item => item.val);

            industryMap[name] = {
                signal: getSparklineSignal(series),
                lastValue: series.at(-1),
                seriesLength: series.length,
                series
            };
        });

        //
        // 4) RESPONSE
        //
        res.json({
            stocks: stockMap,
            sectors: sectorMap,
            industries: industryMap
        });

    } catch (err) {
        console.error("SparkSignals ERROR:", err);
        res.status(500).json({ error: "SparkSignals failed" });
    }
});

module.exports = router;
