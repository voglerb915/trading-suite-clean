// routes/etfs.js

const express = require("express");
const router = express.Router();
const { buildEtfRsSnapshot } = require("../../analysis/rs/rsPipelineEtfs");

// ETF-Daten direkt zurückgeben
router.get("/", async (req, res) => {
    try {
        const data = await buildEtfRsSnapshot();
        res.json(data);
    } catch (err) {
        console.error("ETF Pipeline Fehler:", err);
        res.status(500).json({ error: "ETF Pipeline Fehler" });
    }
});

module.exports = router;
