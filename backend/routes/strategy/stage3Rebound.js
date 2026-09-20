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

// ======================================================
// STAGE3 REBOUND CACHE GENERATOR
// ======================================================

async function generateAndSaveJsonCache() {

    const pool = await tradingConnect;

    const query = `
SELECT
    f.ticker,
    f.company,
    f.sector,
    f.industry,
    f.price,
    f.sma200,
    f._52w_high,
    f._50d_low,
    f.[index] AS finviz_index,
    f.anl_datum,
    m.vma_20

FROM trading.dbo.finviz f

INNER JOIN yahoo.dbo.StockMetrics m
    ON f.ticker = m.ticker
    AND CAST(m.[date] AS DATE) = (
        SELECT MAX(CAST([date] AS DATE))
        FROM yahoo.dbo.StockMetrics
    )

INNER JOIN (

    SELECT
        ticker,
        MAX(sma200) AS max_sma200_100d

    FROM yahoo.dbo.StockMetrics

    WHERE [date] >= DATEADD(DAY,-100,GETDATE())

    GROUP BY ticker

) smamax

    ON smamax.ticker = f.ticker

WHERE f.anl_datum = (
    SELECT MAX(anl_datum)
    FROM trading.dbo.finviz
)

AND f.industry NOT LIKE '%Exchange Traded Fund%'
AND f.industry NOT LIKE '%Shell Companies%'
AND f.industry NOT LIKE '%Blank Check%'

AND m.sma200 < smamax.max_sma200_100d

-- Liquidität
AND m.vma_20 >= 250000

-- kein Low-Price Stock
AND f.price >= 10

-- mindestens 250 Handelstage Historie
AND f.ticker IN (
    SELECT ticker
    FROM yahoo.dbo.DailyHistory
    GROUP BY ticker
    HAVING COUNT(*) >= 250
)

-- möglichst nahe am SMA200, aber oberhalb
AND f.sma200 >= 0
AND f.sma200 <= 5

-- deutliche Korrektur vom Hoch
AND f._52w_high <= -15

ORDER BY
    ABS(f.sma200),
    f._52w_high DESC;

    `;

    const result = await pool.request().query(query);

    const formattedData = result.recordset.map(row => ({
        ...row,
        index: parseIndexField(row.finviz_index)
    }));

    const dirPath = path.join(__dirname, '../../data');

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const filePath = path.join(
        dirPath,
        'stage3_rebound_cache.json'
    );

    fs.writeFileSync(
        filePath,
        JSON.stringify(formattedData, null, 2),
        'utf8'
    );

    return formattedData.length;
}

// ======================================================
// READER
// ======================================================

router.get('/stage3-rebound', (req, res) => {

    try {

        const filePath = path.join(
            __dirname,
            '../../data/stage3_rebound_cache.json'
        );

        if (!fs.existsSync(filePath)) {
            return res.json([]);
        }

        const fileData = fs.readFileSync(
            filePath,
            'utf8'
        );

        res.json(JSON.parse(fileData));

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});

// ======================================================
// MANUELLER GENERATOR
// ======================================================

router.get('/stage3-rebound/generate', async (req, res) => {

    try {

        const count = await generateAndSaveJsonCache();

        res.json({
            success: true,
            message: `${count} Datensätze erfolgreich erzeugt.`
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});

router.get('/stage3-rebound/tv', (req, res) => {

    const filePath = path.join(
        __dirname,
        '../../data/stage3_rebound_cache.json'
    );

    if (!fs.existsSync(filePath)) {
        return res.send('');
    }

    const data = JSON.parse(
        fs.readFileSync(filePath, 'utf8')
    );

    const tickers = data
        .map(x => x.ticker)
        .join('\n');

    res.type('text/plain');
    res.send(tickers);

});

module.exports = router;