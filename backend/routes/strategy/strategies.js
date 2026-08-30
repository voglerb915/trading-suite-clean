// backend/routes/strategy/strategies.js

const express = require('express');
const router = express.Router();
const { runStrategy } = require('../../analysis/strategyEngine.js');
const { tradingPool, tradingConnect } = require('../../db/connection.js');

// Finviz-Daten (nur letzter Tag)
async function loadFinviz() {
    await tradingConnect;

    const result = await tradingPool.request().query(`
        SELECT 
            ticker,
            _52w_high,
            industry,
            sector,
            anl_datum
        FROM dbo.finviz
        WHERE anl_datum = (SELECT MAX(anl_datum) FROM dbo.finviz)
          AND _52w_high IS NOT NULL
    `);

    return result.recordset;
}

// Strategy-Route
router.get('/:strategyName', async (req, res) => {
    try {
        const strategyName = req.params.strategyName;
        const finvizRows = await loadFinviz();
        const result = runStrategy(strategyName, finvizRows);
        res.json({
        count: result.length,
        data: result
});


    } catch (err) {
        res.status(500).json({ error: "Strategy konnte nicht ausgeführt werden" });
    }
});

router.get('/raw/finviz', async (req, res) => {
    try {
        const rows = await loadFinviz();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Finviz Rohdaten konnten nicht geladen werden" });
    }
});

module.exports = router;
