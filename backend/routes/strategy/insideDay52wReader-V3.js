// backend/routes/strategies/insideDay52wReader.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { config } = require('../../db/connection');
const insideDay52WLogic = require('../../analysis/strategies/insideDay52W');

router.get('/insideDay52w', async (req, res) => {
    try {
        const result = await insideDay52WLogic.getSignals();

res.json({
    strategy: "insideDay52w",
    count: result.length,
    data: result
});


    } catch (err) {
        console.error("InsideDay52wReader ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
