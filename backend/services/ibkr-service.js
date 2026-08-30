const IBSDK = require('ib-sdk');
const axios = require('axios');
const { journalPool } = require('../db/connection');
const sql = require('mssql');
const orderEvents = require('./ibkrEvents'); // Pfad ggf. anpassen

class IBKRService {
    constructor() {
        this.nextIBOrderId = null;
        this.orderMapping = new Map();

        this.ib = new IBSDK.IB({
            port: 7496,
            host: '127.0.0.1',
            clientId: 99
        });

        this.initListeners();
        this.ib.connect();

        // Verzögerter Start des Syncs, damit die DB-Verbindung garantiert bereit ist
        setTimeout(async () => {
            console.log("🔄 Starte verzögerten Executions-Abgleich nach System-Startup...");
            await this.syncMissedExecutions();
        }, 3000);
    }

    initListeners() {
        this.ib.on('nextValidId', (id) => {
            this.nextIBOrderId = id;
            console.log(`📌 IBKR: Nächste gültige Order-ID erhalten: ${this.nextIBOrderId}`);
        });

        this.ib.on('connected', () => {
            console.log("✅ IBKR Service: Verbindung steht.");
            // Automatischer Sofort-Sync hier entfernt – läuft nun über den verzögerten Start im Konstruktor
        });

        this.ib.on('error', (err) => console.error("❌ IBKR Service Fehler:", err.message));

        this.ib.on('execDetails', async (reqId, contract, execution) => {
            await this.handleExecDetails(contract, execution);
        });

        this.ib.on('orderStatus', async (orderId, status, filled, remaining, avgFillPrice, permId, parentId, lastFillPrice, clientId, whyHeld, mktCapPrice) => {
            await this.handleOrderStatus(orderId, status);
        });
    }

    // Methode zum Abfragen und Synchronisieren verpasster Ausführungen
    async syncMissedExecutions() {
        return new Promise((resolve) => {
            console.log("🔄 Starte erweiterten Abgleich verpasster Executions (reqExecutions)...");
            
            let syncedCount = 0;
            const tempReqId = 8888; // Eindeutige ReqID für den Sync

            const executionListener = async (reqId, contract, execution) => {
                if (reqId !== tempReqId) return;

                console.log(`📥 [Sync] Execution empfangen für Ticker: ${contract.symbol}, OrderID: ${execution.orderId}, Preis: ${execution.price}`);
                try {
                    await this.handleExecDetails(contract, execution);
                    syncedCount++;
                } catch (err) {
                    console.error("❌ Fehler beim Synchronisieren einer Execution im Sync:", err.message);
                }
            };

            const endListener = (reqId) => {
                if (reqId === tempReqId) {
                    cleanup();
                }
            };

            const cleanup = () => {
                this.ib.removeListener('execDetails', executionListener);
                this.ib.removeListener('execDetailsEnd', endListener);
                console.log(`✅ Abgleich beendet. ${syncedCount} historische/verpasste Ausführungen erfolgreich verarbeitet.`);
                resolve(syncedCount);
            };

            this.ib.on('execDetails', executionListener);
            if (typeof this.ib.on === 'function') {
                this.ib.on('execDetailsEnd', endListener);
            }

            // Kurzer Puffer, damit die TWS nach dem Connect-Handshake die Requests sicher annimmt
            setTimeout(() => {
                try {
                    const filter = {}; 
                    this.ib.reqExecutions(tempReqId, filter);
                    console.log("📤 reqExecutions erfolgreich an IBKR gesendet.");
                } catch (e) {
                    console.error("❌ Konnte reqExecutions nicht senden:", e.message);
                }
            }, 1000);

            // Sicherheits-Fallback: Nach 5 Sekunden aufräumen
            setTimeout(() => {
                cleanup();
            }, 6000);
        });
    }

    async placeBracketOrder(pendingId) {
        if (!this.nextIBOrderId) {
            throw new Error("Keine gültige IB Order-ID verfügbar (Verbindung steht evtl. noch nicht).");
        }

        const parentId = this.nextIBOrderId;

        const result = await journalPool.request()
            .input('id', pendingId)
            .query('SELECT * FROM OrderCreation WHERE pending_id = @id');
        
        const d = result.recordset[0];
        if (!d) throw new Error(`Order mit ID ${pendingId} nicht gefunden.`);

        await journalPool.request()
            .input('pid', sql.Int, pendingId)
            .query("UPDATE OrderCreation SET status = 'SUBMITTED', is_active = 1 WHERE pending_id = @pid");
        console.log(`📡 DB-Status für ID ${pendingId} auf SUBMITTED gesetzt.`);

        const roundPrice = (p) => (p != null) ? Number(parseFloat(p).toFixed(2)) : null;
        const entryPrice = roundPrice(d.entry_price);
        const limitPrice = roundPrice(d.limit_price);
        const tpPrice = roundPrice(d.tp_price);
        const slPrice = roundPrice(d.initial_sl);

        if (tpPrice === null || slPrice === null) {
            throw new Error(`Abbruch: TP oder SL in DB ist NULL für ID ${pendingId}`);
        }

        const contract = { 
            symbol: d.ticker, 
            secType: "STK", 
            exchange: "SMART", 
            currency: "USD" 
        };

        const parent = {
            orderId: parentId,
            action: d.direction === 'SHORT' ? "SELL" : "BUY",
            totalQuantity: parseInt(d.quantity),
            orderType: "STP LMT",
            lmtPrice: limitPrice,
            auxPrice: entryPrice,
            outsideRth: false,
            tif: 'DAY',
            transmit: false 
        };

        const takeProfit = {
            orderId: parentId + 1,
            parentId: parentId,
            action: d.direction === 'SHORT' ? "BUY" : "SELL",
            totalQuantity: parseInt(d.quantity),
            orderType: "LMT",
            lmtPrice: tpPrice,
            outsideRth: true,
            tif: 'GTC',
            transmit: false 
        };

        const stopLoss = {
            orderId: parentId + 2,
            parentId: parentId,
            action: d.direction === 'SHORT' ? "BUY" : "SELL",
            totalQuantity: parseInt(d.quantity),
            orderType: "STP",
            auxPrice: slPrice,
            outsideRth: false,
            tif: 'GTC',
            transmit: true 
        };

        this.orderMapping.set(parentId, { dbId: pendingId, role: 'ENTRY' });
        this.orderMapping.set(parentId + 1, { dbId: pendingId, role: 'EXIT' });
        this.orderMapping.set(parentId + 2, { dbId: pendingId, role: 'EXIT' });

        try {
            await axios.post(`http://localhost:4000/api/orders/execution-record`, {
                pending_id: pendingId,
                ib_order_id: String(parentId),
                executed_qty: 0,
                avg_fill_price: 0,
                status: 'SUBMITTED',
                order_role: 'ENTRY'
            });
            console.log(`📝 [ID: ${pendingId}] Initial-Status SUBMITTED in ExecutedOrders hinterlegt.`);
        } catch (execErr) {
            console.error("⚠️ SUBMITTED-Eintrag fehlgeschlagen:", execErr.message);
        }

        await this.ib.placeOrder(parent.orderId, contract, parent);
        await this.ib.placeOrder(takeProfit.orderId, contract, takeProfit);
        await this.ib.placeOrder(stopLoss.orderId, contract, stopLoss);

        this.nextIBOrderId += 3;
        return parentId;
    }

    async handleExecDetails(contract, execution) {
        let mapping = this.orderMapping.get(execution.orderId);
        let dbPendingId;
        let role = 'EXIT';

        if (mapping) {
            dbPendingId = mapping.dbId;
            role = mapping.role;
        } else {
            try {
                const res = await journalPool.request()
                    .input('ibId', String(execution.orderId))
                    .query('SELECT pending_id, order_role FROM ExecutedOrders WHERE ib_order_id = @ibId');
                
                if (res.recordset.length > 0) {
                    dbPendingId = res.recordset[0].pending_id;
                    role = res.recordset[0].order_role || 'EXIT';
                } else {
                    const fallbackRes = await journalPool.request()
                        .input('ticker', contract.symbol)
                        .query("SELECT TOP 1 pending_id FROM OrderCreation WHERE ticker = @ticker AND is_active = 1 ORDER BY pending_id DESC");
                    
                    if (fallbackRes.recordset.length > 0) {
                        dbPendingId = fallbackRes.recordset[0].pending_id;
                    } else {
                        return;
                    }
                }
            } catch (dbErr) {
                console.error("❌ Fehler beim Ermitteln der pending_id im Fallback:", dbErr.message);
                return;
            }
        }

        const isExit = (role === 'EXIT');

        try {
            const executionData = {
                pending_id: dbPendingId,
                ib_order_id: String(execution.orderId), 
                executed_qty: execution.shares,
                avg_fill_price: execution.price,
                status: 'EXECUTED',
                order_role: role
            };

            await axios.post(`http://localhost:4000/api/orders/execution-record`, executionData);
            
            if (isExit) {
                await axios.patch(`http://localhost:4000/api/orders/update-status/${dbPendingId}`, { is_active: 0 });
                console.log(`✅ [ID: ${dbPendingId}] [${contract.symbol}] Exit gefüllt (auch via Sync). (Inaktiviert)`);
                this.orderMapping.delete(execution.orderId);
            } else {
                await axios.patch(`http://localhost:4000/api/orders/update-status/${dbPendingId}`, { is_active: 1 });
                console.log(`🎯 [ID: ${dbPendingId}] [${contract.symbol}] Entry gefüllt. (Bleibt aktiv)`);
            }

            orderEvents.emit('refreshOrders', { type: 'REFRESH_ORDERS' });

        } catch (err) {
            console.error("❌ Fehler bei execDetails im Service:", err.message);
        }
    }

    async handleOrderStatus(orderId, status) {
        if (status === 'Cancelled' || status === 'Inactive') {
            const mapping = this.orderMapping.get(orderId);
            if (!mapping) return;

            const dbPendingId = mapping.dbId;

            if (mapping.role === 'EXIT') {
                console.log(`ℹ️ [ID: ${dbPendingId}] Exit-Order (TP/SL) von TWS entfernt. Kein DB-Eintrag nötig.`);
                this.orderMapping.delete(orderId);
                return; 
            }

            console.log(`🚫 Haupt-Order storniert: IB-ID ${orderId} (DB-ID: ${dbPendingId})`);

            try {
                await axios.post(`http://localhost:4000/api/orders/execution-record`, {
                    pending_id: dbPendingId,
                    ib_order_id: String(orderId),
                    executed_qty: 0,
                    avg_fill_price: 0,
                    status: 'CANCELED',
                    order_role: mapping.role
                });

                await axios.patch(`http://localhost:4000/api/orders/update-status/${dbPendingId}`, { is_active: 0 });
                this.orderMapping.delete(orderId);
                console.log(`✅ Stornierung für DB-ID ${dbPendingId} sauber protokolliert.`);

                orderEvents.emit('refreshOrders', { type: 'REFRESH_ORDERS' });

            } catch (execErr) {
                console.error("❌ Fehler bei Stornierungs-Logik im Service:", execErr.message);
            }
        }
    }
}

module.exports = new IBKRService();