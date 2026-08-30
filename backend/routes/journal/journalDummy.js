const express = require('express');
const router = express.Router();

async function getJournalEntries(req, res) {
    if (res && res.json) {
        return res.json({ success: true, data: [], message: "Journal dummy active" });
    }
    return [];
}

function renderJournalView() {
    return `<div class="journal-dummy">Journal Modul in Vorbereitung...</div>`;
}

// Hauptroute /api/journal/
router.get('/', async (req, res) => {
    await getJournalEntries(req, res);
});

// Wichtig für das Frontend: /api/journal/executed abfangen, damit kein 404 entsteht
router.get('/executed', (req, res) => {
    res.json({ success: true, data: [] });
});

// Nur den Express-Router exportieren!
module.exports = router;