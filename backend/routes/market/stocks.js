// routes/stocks.js
const express = require('express');
const router = express.Router();
const stocksService = require('../../services/stocksService');

// NEU: Momentum-Route für Aktien (mit optionalem Index-Filter oder Tagen)
router.get("/momentum", async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 5; 
        const universe = req.query.universe || 'all'; // Falls du nach Index filtern willst
        const momentumData = await stocksService.getStockMomentum(days, universe);
        res.json(momentumData);
    } catch (err) {
        console.error("Fehler beim Laden des Aktien-Momentums:", err);
        res.status(500).json({ error: "Fehler beim Laden des Aktien-Momentums" });
    }
});

// Bestehende Standard-Route
router.get('/', async (req, res, next) => {
    try {
        const data = await stocksService.getStocksForList();
        res.json(data);
    } catch (err) {
        next(err);
    }
});

module.exports = router;