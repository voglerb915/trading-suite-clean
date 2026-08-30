const express = require("express");
const router = express.Router();
// Importiere beide Funktionen aus deinem Industrie-Service:
const { getIndustriesForList, getIndustryMomentum } = require("../../services/industriesService");

// NEU: Momentum-Route für die Industrien
router.get("/momentum", async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 5; 
        const momentumData = await getIndustryMomentum(days);
        res.json(momentumData);
    } catch (err) {
        console.error("Fehler beim Laden des Industrie-Momentums:", err);
        res.status(500).json({ error: "Fehler beim Laden des Industrie-Momentums" });
    }
});

// Bestehende Standard-Route
router.get("/", async (req, res) => {
    try {
        const data = await getIndustriesForList();
        res.json(data);
    } catch (err) {
        console.error("Fehler beim Laden der Industrien:", err);
        res.status(500).json({ error: "Fehler beim Laden der Industrien" });
    }
});

module.exports = router;