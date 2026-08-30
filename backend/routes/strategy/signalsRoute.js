/**
 * signalsRoute.js
 * ----------------
 * Aufgabe:
 *  - Engine starten (runSignalsEngine)
 *  - Dashboard-Formatter (prepareSignals) bereitstellen
 */

console.log("🔥 signalsRoute LOADED");

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

const { prepareSignals } = require('../../services/prepareSignals');
const { runSignalsEngine } = require('../../workers/signalsEngine');

// ENGINE STARTEN (Control-Center)
// SIGNALS ROUTE
router.get('/run-engine', async (req, res) => {
    try {
        // 1. Engine ausführen
        const result = await runSignalsEngine();
        
        // 2. Antwort an das Frontend (calculations.js)
        // WICHTIG: Das Frontend sucht nach "success: true"
        res.json({ 
            success: true, 
            message: "Engine erfolgreich ausgeführt",
            data: result // Falls die Engine Details zurückgibt
        });
    } catch (err) {
        logger.error('SIGNALS-ENGINE', `Fehler: ${err.message}`);
        // Das Frontend sieht "success: false" und setzt das ❌
        res.status(500).json({ success: false, error: err.message });
    }
});

// DASHBOARD-DATEN (iframe Dashboard)
router.get('/mid-signal', async (req, res) => {
    try {
        const data = await prepareSignals();
        res.json(data);
    } catch (err) {
        logger.error('SIGNALS-ROUTE', `Fehler: ${err.message}`);
        res.status(500).json({ error: 'Fehler beim Abruf der Signale' });
    }
});

module.exports = router;
