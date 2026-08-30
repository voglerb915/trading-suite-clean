const express = require("express");
const router = express.Router();
// Importiere jetzt beide Funktionen aus deinem Service:
const { getSectorsForList, getSectorMomentum } = require("../../services/sectorsService");

// NEU: Momentum-Route (wichtig: vor oder nach der Standard-Route, da /momentum spezifischer ist)
router.get("/momentum", async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 5; 
        const momentumData = await getSectorMomentum(days);
        res.json(momentumData);
    } catch (err) {
        console.error("Fehler beim Laden des Sektor-Momentums:", err);
        res.status(500).json({ error: "Fehler beim Laden des Sektor-Momentums" });
    }
});

// Bestehende Standard-Route
router.get("/", async (req, res) => {
    try {
        const data = await getSectorsForList();
        res.json(data);
    } catch (err) {
        console.error("Fehler beim Laden der Sektoren:", err);
        res.status(500).json({ error: "Fehler beim Laden der Sektoren" });
    }
});

module.exports = router;