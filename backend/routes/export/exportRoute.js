const express = require('express');
const router = express.Router();
const exportService = require('./exportService'); 
const { getTradingDate } = require('../../utils/dateHelper');

router.post('/', (req, res) => {
    try {
        const { type, data, options } = req.body;
        
        // Ergebnis vom Export-Service entgegennehmen
        const result = exportService.generate(type, data, options, { getTradingDate });
        
        // Erfolgsantwort inklusive Count an das Frontend senden
        res.json({ 
            success: true, 
            count: data && Array.isArray(data) ? data.length : 0,
            ...result 
        });
    } catch (error) {
        console.error("Export-Fehler:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;