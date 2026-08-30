const express = require('express');
const router = express.Router();
const { journalPool, sql } = require('../../db/connection');

// GET: Nur AKTIVE Einträge abrufen
router.get('/', async (req, res) => {
    try {
        const pool = await journalPool;
        const result = await pool.request().query(`
            SELECT * FROM watchlist 
            WHERE is_active = 1 
            ORDER BY id DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('WATCHLIST-GET ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST: Neuen Ticker hinzufügen
router.post('/add', async (req, res) => {
    try {
        const d = req.body; 
        const pool = await journalPool;

        await pool.request()
            .input('ticker', sql.VarChar, d.ticker)
            .input('date', sql.Date, d.date) 
            .input('strategy_name', sql.VarChar, d.strategy_name)
            .input('setup_high', sql.Float, d.setup_high)
            .input('setup_low', sql.Float, d.setup_low)
            .input('mc_id', sql.Int, d.market_context_id || null)
            .query(`
                INSERT INTO watchlist 
                (ticker, date, strategy_name, setup_high, setup_low, market_context_id, added_at, is_active)
                VALUES 
                (@ticker, @date, @strategy_name, @setup_high, @setup_low, @mc_id, GETDATE(), 1)
            `);

        res.json({ status: 'success', message: `${d.ticker} gespeichert` });
    } catch (err) {
        console.error('WATCHLIST-ADD ERROR:', err.message);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// POST: Batch Soft-Delete für die letzten X aktiven Einträge (MUSS VOR /:id stehen!)
router.post('/delete-last-batch', async (req, res) => {
    try {
        const count = req.body.count || 10;
        console.log(`Versuche die ${count} ältesten aktiven Watchlist-Einträge auf is_active = 0 zu setzen...`);

        const pool = await journalPool;
        const result = await pool.request()
            .input('count', sql.Int, count)
            .query(`
                WITH TargetRows AS (
                    SELECT TOP (@count) is_active, archived_at
                    FROM watchlist
                    WHERE is_active = 1
                    ORDER BY id ASC
                )
                UPDATE TargetRows
                SET is_active = 0, 
                    archived_at = GETDATE();
            `);

        console.log("Batch Soft-Update rowsAffected:", result.rowsAffected);

        res.json({ 
            status: 'success', 
            message: `${result.rowsAffected[0]} älteste Einträge erfolgreich archiviert`,
            affectedRows: result.rowsAffected[0]
        });
    } catch (err) {
        console.error('WATCHLIST-BATCH-DELETE ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PATCH: Aktualisiert Notiz ODER Strategie
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_notes, note, strategy } = req.body;
        const notesToSave = user_notes !== undefined ? user_notes : note;
        const pool = await journalPool;

        if (notesToSave !== undefined) {
            await pool.request()
                .input('id', sql.Int, id)
                .input('note', sql.NVarChar, notesToSave)
                .query('UPDATE watchlist SET user_notes = @note WHERE id = @id');
        }

        if (strategy !== undefined) {
            await pool.request()
                .input('id', sql.Int, id)
                .input('strategy', sql.VarChar, strategy)
                .query('UPDATE watchlist SET strategy_name = @strategy WHERE id = @id');
        }

        res.json({ status: 'success' });
    } catch (err) {
        console.error('WATCHLIST-PATCH-ERROR:', err.message);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// DELETE: Soft-Delete (is_active = 0) für einen einzelnen Eintrag
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Versuche Eintrag ID ${id} auf is_active = 0 zu setzen...`);
        
        const pool = await journalPool;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE watchlist 
                SET is_active = 0, 
                    archived_at = GETDATE() 
                WHERE id = @id
            `);

        console.log("SQL Update Result rowsAffected:", result.rowsAffected);

        res.json({ status: 'success', message: 'Eintrag archiviert' });
    } catch (err) {
        console.error('WATCHLIST-DELETE ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;