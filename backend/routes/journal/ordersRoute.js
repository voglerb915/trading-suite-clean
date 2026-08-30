const express = require('express');
const router = express.Router();
const { journalPool, sql } = require('../../db/connection');


// ---------------------------------------------------------
// 1. GET: Alle aktiven Order-Entwürfe laden (Tab 3 / Einkaufswagen)
// ---------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const pool = await journalPool;
        const result = await pool.request()
            .query(`
                SELECT * FROM OrderCreation 
                WHERE is_active = 1 
                AND status = 'DRAFT' 
                ORDER BY created_at DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('ORDERS - Fehler beim Laden der Draft-Orders:', err.message);
        res.status(500).json({ error: 'Fehler beim Laden der Orders' });
    }
});

// ---------------------------------------------------------
// 2. POST: Neuen Order-Entwurf speichern
// ---------------------------------------------------------
router.post('/create', async (req, res) => {
    try {
        const { 
            ticker, direction, trade_type, strategy, 
            order_type, entry_price, limit_price, tp_price, 
            initial_sl, quantity, pyramid_id, market_context_id 
        } = req.body;

        const pool = await journalPool;
        await pool.request()
            .input('ticker', sql.VarChar, ticker)
            .input('direction', sql.VarChar, direction)
            .input('trade_type', sql.VarChar, trade_type)
            .input('strategy', sql.VarChar, strategy)
            .input('order_type', sql.VarChar, order_type)
            .input('entry_price', sql.Decimal(18, 4), entry_price)
            .input('limit_price', sql.Decimal(18, 4), limit_price || null)
            .input('tp_price', sql.Float, tp_price || null) // Angepasst auf Float (entspricht Tabellenschema)
            .input('initial_sl', sql.Decimal(18, 4), initial_sl)
            .input('quantity', sql.Int, quantity)
            .input('pyramid_id', sql.Int, pyramid_id || null)
            .input('mc_id', sql.Int, market_context_id || null)
            .query(`
                INSERT INTO OrderCreation 
                (ticker, direction, trade_type, strategy, order_type, 
                entry_price, limit_price, tp_price, initial_sl, 
                quantity, pyramid_id, market_context_id, status, is_active, created_at)
                VALUES 
                (@ticker, @direction, @trade_type, @strategy, @order_type, 
                @entry_price, @limit_price, @tp_price, @initial_sl, 
                @quantity, @pyramid_id, @mc_id, 'DRAFT', 1, GETDATE())
            `);
            
        console.log(`ORDERS - Order-Entwurf für ${ticker} erstellt.`);
        res.json({ success: true });
    } catch (err) {
        console.error('ORDERS - Fehler beim Erstellen:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// 3. GET: Alle aktiven/gesendeten Orders laden (Tab 4)
// ---------------------------------------------------------
router.get('/active', async (req, res) => {
    try {
        const pool = await journalPool;
        const result = await pool.request().query(`
            SELECT 
                oc.pending_id, 
                oc.ticker, 
                eo.ib_order_id,
                eo.status,         
                eo.executed_qty as net_qty,
                eo.execution_time,   
                oc.strategy,
                oc.created_at        
            FROM ExecutedOrders eo
            JOIN OrderCreation oc ON eo.pending_id = oc.pending_id
            WHERE eo.is_active = 1  -- <--- Filter für das Soft Delete hinzugefügt
            AND eo.execution_id IN (  
                SELECT MAX(execution_id) FROM ExecutedOrders WHERE is_active = 1 GROUP BY pending_id
            )
            ORDER BY oc.created_at DESC;
        `);

        res.json(result.recordset); 

    } catch (err) {
        console.error('SQL-FEHLER in /active:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// 4. POST: Realen Fill speichern (mit order_role)
// ---------------------------------------------------------
router.post('/execution-record', async (req, res) => {
    try {
        const { pending_id, ib_order_id, executed_qty, avg_fill_price, status, order_role } = req.body;
        const pool = await journalPool;

        await pool.request()
            .input('pid', sql.Int, pending_id)
            .input('ib_id', sql.VarChar, ib_order_id || '')
            .input('qty', sql.Int, executed_qty)
            .input('price', sql.Decimal(18, 4), avg_fill_price)
            .input('status', sql.VarChar, status || 'EXECUTED')
            .input('role', sql.VarChar, order_role || 'ENTRY') // Standardmäßig ENTRY
            .query(`
                INSERT INTO ExecutedOrders 
                (pending_id, ib_order_id, executed_qty, avg_fill_price, execution_time, status, order_role)
                VALUES 
                (@pid, @ib_id, @qty, @price, GETDATE(), @status, @role)
            `);

        console.log(`EXECUTION - Fill (${order_role || 'ENTRY'}) für ID ${pending_id} gespeichert.`);
        res.json({ success: true });
    } catch (err) {
        console.error('EXECUTION-ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// 5. GET: Historie der Ausführungen (Tab 5) - AGGREGIERT
// ---------------------------------------------------------
router.get('/executed-list', async (req, res) => {
    try {
        const pool = await journalPool;
        const result = await pool.request()
            .query(`
                SELECT 
                    o.ticker,
                    o.direction,
                    o.strategy,
                    SUM(e.executed_qty) AS total_qty,
                    AVG(e.avg_fill_price) AS avg_price,
                    MAX(e.execution_time) AS last_execution,
                    e.status
                FROM ExecutedOrders e
                INNER JOIN OrderCreation o ON e.pending_id = o.pending_id
                GROUP BY o.ticker, o.direction, o.strategy, e.status
                ORDER BY last_execution DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('EXECUTED-LIST - Fehler:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// 1. DELETE: Order-Entwurf (Tab 3 / Open Orders)
// Zielt AUSSCHLIESSLICH auf OrderCreation
// Aufruf im Frontend: DELETE /api/ibkr/orders/:id
// ---------------------------------------------------------
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await journalPool;
        
        await pool.request()
            .input('id', sql.Int, id)
            .query(`UPDATE OrderCreation SET is_active = 0, archived_at = GETDATE() WHERE pending_id = @id`);

        console.log(`ORDERS - OrderCreation mit ID ${id} per Soft-Delete auf inaktiv gesetzt.`);
        res.json({ success: true });
    } catch (err) { 
        console.error('DELETE-ORDER-CREATION-ERROR:', err.message);
        res.status(500).send(err.message); 
    }
});

// ---------------------------------------------------------
// 2. DELETE: Active Order (Tab 4)
// Zielt AUSSCHLIESSLICH auf ExecutedOrders
// Aufruf im Frontend: DELETE /api/ibkr/orders/executed/:id
// ---------------------------------------------------------
router.delete('/executed/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await journalPool;
        
        await pool.request()
            .input('id', sql.Int, id)
            .query(`UPDATE ExecutedOrders SET is_active = 0 WHERE pending_id = @id`);

        console.log(`ORDERS - ExecutedOrders mit ID ${id} per Soft-Delete auf inaktiv gesetzt.`);
        res.json({ success: true });
    } catch (err) { 
        console.error('DELETE-EXECUTED-ORDERS-ERROR:', err.message);
        res.status(500).send(err.message); 
    }
});

router.patch('/update-status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, is_active } = req.body;
        const pool = await journalPool;
        const request = pool.request().input('id', sql.Int, id);
        let updates = [];
        if (status) { request.input('s', sql.VarChar, status); updates.push("status = @s"); }
        if (is_active !== undefined) { request.input('a', sql.Int, is_active); updates.push("is_active = @a"); }
        if (updates.length > 0) {
            await request.query(`UPDATE OrderCreation SET ${updates.join(", ")} WHERE pending_id = @id`);
        }
        res.json({ success: true });
    } catch (err) { 
        console.error('PATCH-ERROR:', err.message);
        res.status(500).send(err.message); 
    }
});

// ---------------------------------------------------------
// 6. PUT: Die letzten 10 aktiven Order-Entwürfe als Soft-Delete markieren
// ---------------------------------------------------------
router.put('/batch-delete-last-ten', async (req, res) => {
    try {
        const pool = await journalPool;
        await pool.request().query(`
            UPDATE TOP (10) OrderCreation 
            SET is_active = 0, archived_at = GETDATE() 
            WHERE is_active = 1 AND status = 'DRAFT';
        `);
        
        console.log("ORDERS - Die letzten 10 Entwürfe wurden per Batch archiviert.");
        res.json({ success: true });
    } catch (err) {
        console.error('BATCH-DELETE-ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// 7. PUT: Die letzten 10 ExecutedOrders als Soft-Delete markieren
// ---------------------------------------------------------
router.put('/batch-delete-executed-last-ten', async (req, res) => {
    try {
        const pool = await journalPool;
        await pool.request().query(`
            UPDATE TOP (10) ExecutedOrders 
            SET is_active = 0 
            WHERE is_active = 1 OR is_active IS NULL;
        `);
        
        console.log("ORDERS - Die letzten 10 ExecutedOrders wurden per Soft-Delete archiviert.");
        res.json({ success: true });
    } catch (err) {
        console.error('BATCH-DELETE-EXECUTED-ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;