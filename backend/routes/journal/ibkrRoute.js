const express = require('express');
const router = express.Router();
const ibkrService = require('../../services/ibkr-service');
const ibkrEvents = require('../../services/ibkrEvents');

// 1. Lokales Array für die verbundenen Frontend-Clients
let sseClients = [];

// 2. Neuer SSE-Endpunkt
router.get('/events', (req, res) => {
    // CORS-Header explizit für den SSE-Stream setzen
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);
    console.log(`🟢 SSE-Client verbunden. Aktuelle Clients: ${sseClients.length}`);

    req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
        console.log(`🔴 SSE-Client getrennt. Verbleibende Clients: ${sseClients.length}`);
    });
});

// 3. Hilfsfunktion zum Verteilen von Nachrichten
function notifyClients(data) {
    console.log(`📢 notifyClients aufgerufen! Empfänger-Anzahl: ${sseClients.length}`, data);
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(client => client.write(payload));
}

// 4. Einziger Event-Listener für den Event-Bus
ibkrEvents.on('refreshOrders', (data) => {
    console.log('⚡ Event "refreshOrders" in ibkrRoute empfangen! Triggere notifyClients...');
    notifyClients(data);
});

router.post('/place-order', async (req, res) => {
    const { pending_id } = req.body; 

    if (!pending_id) {
        return res.status(400).json({ success: false, error: "Keine pending_id übermittelt." });
    }

    try {
        const ticketId = await ibkrService.placeBracketOrder(pending_id);

        notifyClients({ type: 'REFRESH_ORDERS', pending_id });

        res.json({ 
            success: true, 
            message: "Status auf SUBMITTED gesetzt & Bracket an IBKR gesendet",
            orderId: ticketId,    
            ticketId: ticketId    
        });

    } catch (err) {
        console.error("❌ Fehler bei place-order Route:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. Endpunkt für den Abgleich verpasster Executions von IBKR
router.post('/sync-executions', async (req, res) => {
    try {
        console.log("🔄 Starte manuellen Abgleich der Executions mit IBKR...");
        
        const syncedCount = await ibkrService.syncMissedExecutions();

        notifyClients({ type: 'REFRESH_ORDERS' });

        res.json({ 
            success: true, 
            message: `Abgleich erfolgreich abgeschlossen. ${syncedCount || 0} Trades synchronisiert.` 
        });

    } catch (err) {
        console.error("❌ Fehler beim Sync der Executions:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Beispiel für den Express-Endpunkt /api/orders/execution-record
router.post('/execution-record', async (req, res) => {
    const { pending_id, ib_order_id, executed_qty, avg_fill_price, status, order_role } = req.body;

    try {
        // 1. Prüfen, ob dieser Eintrag bereits existiert, um Dubletten zu verhindern
        const checkDuplicate = await journalPool.request()
            .input('pendingId', pending_id)
            .input('ibId', ib_order_id)
            .input('role', order_role)
            .input('qty', executed_qty)
            .input('price', avg_fill_price)
            .query(`
                SELECT COUNT(*) as cnt FROM ExecutedOrders 
                WHERE pending_id = @pendingId 
                  AND ib_order_id = @ibId 
                  AND order_role = @role 
                  AND executed_qty = @qty 
                  AND avg_fill_price = @price
            `);

        if (checkDuplicate.recordset[0].cnt > 0) {
            return res.status(200).json({ message: 'Execution existiert bereits, übersprungen.' });
        }

        // 2. Normaler Insert, falls noch nicht vorhanden
        await journalPool.request()
            .input('pendingId', pending_id)
            .input('ibId', ib_order_id)
            .input('qty', executed_qty)
            .input('price', avg_fill_price)
            .input('status', status)
            .input('role', order_role)
            .query(`
                INSERT INTO ExecutedOrders (pending_id, ib_order_id, executed_qty, avg_fill_price, status, order_role, created_at)
                VALUES (@pendingId, @ibId, @qty, @price, @status, @role, GETDATE())
            `);

        res.status(201).json({ message: 'Execution erfolgreich gespeichert.' });
    } catch (err) {
        console.error("❌ Fehler beim Speichern der Execution:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;