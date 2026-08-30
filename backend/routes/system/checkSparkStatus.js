const express = require('express');
const router = express.Router();
// Importiere den POOL, nicht den Connect-Promise
const { tradingPool } = require('../../db/connection'); 

router.get('/check-spark-status', async (req, res) => {
    try {
        // Nutze tradingPool.request().query()
        // mssql benötigt bei Pools immer ein .request() Objekt
        const result = await tradingPool.request().query(`
            SELECT COUNT(*) as count 
            FROM marketScores 
            WHERE CAST(anl_datum AS DATE) = CAST(GETDATE() AS DATE)
            AND signal_type IS NOT NULL 
            AND signal_type <> ''
        `);
        
        // Bei mssql sind die Daten in .recordset
        res.json({ isDone: result.recordset[0].count > 0 }); 
    } catch (err) {
        res.status(500).json({ isDone: false, error: err.message });
    }
});

module.exports = router;