const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

router.get('/update-short-strategy', async (req, res) => {
    try {
        logger.update('UPDATE-SHORT', 'JSON-Export gestartet');

        const target = "C:\\Users\\Nutzer\\OneDrive\\Boerse\\mein-dashboard\\db\\distribution_short.json";

        const data = {
            timestamp: new Date().toISOString(),
            message: "Short-JSON erfolgreich aktualisiert"
        };

        fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf8');

        logger.update('UPDATE-SHORT', 'JSON erfolgreich geschrieben');

        res.json({ success: true });

    } catch (err) {
        logger.error('UPDATE-SHORT', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
