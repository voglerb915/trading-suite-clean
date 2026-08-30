const express = require('express');
const router = express.Router();

const { runShortStrategy } = require('../services/shortStrategyService');
const { runUpdateMetrics } = require('../services/updateMetricsService');


// ----------------------------------------------------
// 🔥 NEU: Caching für diese API-Routen deaktivieren
// ----------------------------------------------------
router.use((req, res, next) => {
    // Keine Browser-Caches, keine 304-Responses
    res.set('Cache-Control', 'no-store');
    next();
});


// ----------------------------------------------------
// Short-Strategie
// ----------------------------------------------------
router.get('/short-strategy', async (req, res) => {
    console.log("BACKEND: /short-strategy wurde aufgerufen");   // <-- NEU: Log

    try {
        const result = await runShortStrategy();
        res.status(200).send(result);
    } catch (err) {
        console.error("BACKEND ERROR short-strategy:", err);    // <-- NEU: Log
        res.status(500).send(err.message);
    }
});


// ----------------------------------------------------
// Update-Metrics
// ----------------------------------------------------
router.get('/update-metrics', async (req, res) => {
    console.log("BACKEND: /update-metrics wurde aufgerufen");   // <-- NEU: Log

    try {
        const result = await runUpdateMetrics();
        res.status(200).send(result);
    } catch (err) {
        console.error("BACKEND ERROR update-metrics:", err);    // <-- NEU: Log
        res.status(500).send(err.message);
    }
});


module.exports = router;
