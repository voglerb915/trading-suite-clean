import { BaseTile } from './tiles/baseTile.js';

export class JournalAnalytics {
    constructor(containerElement) {
        this.container = containerElement;
    }

    renderOverview(data) {
        if (!data || data.length === 0) {
            this.container.innerHTML = `<div style="color: #888; font-style: italic; font-size: 12px; padding: 15px;">Keine Analysedaten verfügbar.</div>`;
            return;
        }

        // --- SCHRITT 0: Zeilen pro pending_id zu einem vollständigen Trade mergen ---
        const tradeMap = {};
        data.forEach(item => {
            const id = item.pending_id;
            if (!id) return;

            if (!tradeMap[id]) {
                tradeMap[id] = {
                    pending_id: id,
                    ticker: item.ticker,
                    strategy: item.strategy,
                    initial_sl: 0,
                    entry_price: 0,
                    exit_price: 0,
                    quantity: Number(item.quantity || 0),
                    entry_date: null,
                    exit_date: null
                };
            }

            // Werte aus den jeweiligen Zeilen einsammeln
            if (item.order_role === 'ENTRY' && Number(item.entry_price) > 0) {
                tradeMap[id].entry_price = Number(item.entry_price);
                tradeMap[id].entry_date = item.entry_date;
            }
            if (item.order_role === 'EXIT' && Number(item.exit_price) > 0) {
                tradeMap[id].exit_price = Number(item.exit_price);
                tradeMap[id].exit_date = item.entry_date; 
            }
            
            // Stop-Preis / Initial SL abfangen (egal ob stop_price oder initial_sl)
            const slVal = item.stop_price ?? item.initial_sl;
            if (slVal && Number(slVal) > 0) {
                tradeMap[id].initial_sl = Number(slVal);
            }
        });

        // Wir arbeiten ab sofort mit den konsolidierten Trades statt mit den rohen SQL-Zeilen
        const consolidatedTrades = Object.values(tradeMap);

        // --- 1. Globale Gesamtübersicht ---
        const totalTrades = consolidatedTrades.length;
        const uniqueTickers = [...new Set(consolidatedTrades.map(i => i.ticker).filter(Boolean))].length;
        
        let globalPnL = 0;
        consolidatedTrades.forEach(item => {
            if (item.entry_price && item.exit_price && item.quantity) {
                globalPnL += (item.exit_price - item.entry_price) * item.quantity;
            }
        });

        const globalTile = new BaseTile(
            'Gesamtübersicht', 
            'Macro Metrics', 
            {
                'Gesamt-Trades': { text: totalTrades, color: '#3498db' },
                'Gehandelte Ticker': { text: uniqueTickers, color: '#fff' },
                'Gesamt PnL': { text: `${globalPnL >= 0 ? '+' : ''}${globalPnL.toFixed(2)} €`, color: globalPnL >= 0 ? '#2ecc71' : '#e74c3c' },
                'Status': { text: 'Aktiv', color: '#f39c12' }
            }, 
            '#3498db', 
            '#3498db'
        );

        // --- 2. Gruppierung & Detaillierte Metriken pro Strategie ---
        const strategyMap = {};

        consolidatedTrades.forEach(item => {
            const strat = item.strategy || 'Unbekannt';
            if (!strategyMap[strat]) {
                strategyMap[strat] = {
                    trades: [],
                    grossProfit: 0,
                    grossLoss: 0,
                    winsCount: 0,
                    lossCount: 0,
                    totalR: 0,
                    maxLoss: 0,
                    winDurationMs: 0,
                    lossDurationMs: 0,
                    minDate: null,
                    maxDate: null
                };
            }

            const s = strategyMap[strat];
            s.trades.push(item);

            const entry = item.entry_price;
            const exit = item.exit_price;
            const qty = item.quantity;
            const pnl = (exit - entry) * qty;

            if (pnl > 0) {
                s.grossProfit += pnl;
                s.winsCount++;
            } else if (pnl < 0) {
                const absLoss = Math.abs(pnl);
                s.grossLoss += absLoss;
                s.lossCount++;
                if (absLoss > s.maxLoss) s.maxLoss = absLoss;
            }

            // --- R-Verhältnis berechnen ---
            if (entry > 0 && exit > 0 && item.initial_sl > 0) {
                const risk = Math.abs(entry - item.initial_sl);
                const reward = Math.abs(exit - entry);
                if (risk > 0) {
                    const tradeR = reward / risk;
                    s.totalR += (pnl < 0 ? -tradeR : tradeR);
                }
            }

            // Haltedauer & Datumsbereich
            if (item.entry_date) {
                const entryTime = new Date(item.entry_date).getTime();
                if (!s.minDate || entryTime < s.minDate) s.minDate = entryTime;
                if (!s.maxDate || entryTime > s.maxDate) s.maxDate = entryTime;

                if (item.exit_date) {
                    const exitTime = new Date(item.exit_date).getTime();
                    const duration = exitTime - entryTime;
                    if (duration > 0) {
                        if (pnl >= 0) s.winDurationMs += duration;
                        else s.lossDurationMs += duration;
                    }
                }
            }
        });

        // --- 3. Strategie-Tiles mit ALLEN gewünschten Metriken erzeugen ---
        let strategyTilesHtml = '';

        for (const [stratName, s] of Object.entries(strategyMap)) {
            const count = s.trades.length;
            const winRate = count > 0 ? ((s.winsCount / count) * 100).toFixed(1) : '0.0';
            const profitFactor = s.grossLoss > 0 ? (s.grossProfit / s.grossLoss).toFixed(2) : (s.grossProfit > 0 ? 'MAX' : '0.00');
            const netPnL = s.grossProfit - s.grossLoss;

            const avgWin = s.winsCount > 0 ? (s.grossProfit / s.winsCount).toFixed(2) : '0.00';
            const avgLoss = s.lossCount > 0 ? (s.grossLoss / s.lossCount).toFixed(2) : '0.00';
            const avgR = count > 0 ? (s.totalR / count).toFixed(2) : '0.00';

            // Haltedauern Formatieren
            const formatDuration = (ms, c) => {
                if (c === 0 || ms === 0) return '-';
                const avgMins = Math.round((ms / c) / 60000);
                const hrs = Math.floor(avgMins / 60);
                const mins = avgMins % 60;
                return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
            };

            // Trades pro Woche berechnen
            let tradesPerWeek = count.toString();
            if (s.minDate && s.maxDate && s.maxDate > s.minDate) {
                const weeks = Math.max(1, (s.maxDate - s.minDate) / (1000 * 60 * 60 * 24 * 7));
                tradesPerWeek = (count / weeks).toFixed(1);
            }

            const stratMetrics = {
                // 1. Performance
                'Win-Rate': { text: `${winRate}%`, color: Number(winRate) >= 50 ? '#2ecc71' : '#e74c3c' },
                'Profit Factor': { text: profitFactor, color: Number(profitFactor) >= 1.5 ? '#2ecc71' : '#ddd' },
                'Netto-PnL': { text: `${netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)} €`, color: netPnL >= 0 ? '#2ecc71' : '#e74c3c' },
                'Ø Gew / Ø Ver': { text: `${avgWin} / -${avgLoss}`, color: '#fff' },

                // 2. Risiko
                'Ø Risk/Reward': { text: `${avgR} R`, color: '#3498db' },
                'Max. Verlust': { text: s.maxLoss > 0 ? `-${s.maxLoss.toFixed(2)} €` : '0.00 €', color: '#e74c3c' },

                // 3. Zeit & Effizienz
                'Ø Dauer Gewinner': { text: formatDuration(s.winDurationMs, s.winsCount), color: '#2ecc71' },
                'Ø Dauer Verlierer': { text: formatDuration(s.lossDurationMs, s.lossCount), color: '#e74c3c' },
                'Trades / Woche': { text: tradesPerWeek, color: '#f39c12' },
                'Anzahl Trades': { text: count, color: '#fff' }
            };

            const tile = new BaseTile(stratName, 'Strategie', stratMetrics, '#f39c12', '#f39c12');
            strategyTilesHtml += tile.render();
        }

        this.container.innerHTML = `
            ${globalTile.render()}
            <div style="font-weight: bold; color: #fff; margin: 15px 0 10px 0; font-size: 14px;">Strategie-Auswertung</div>
            ${strategyTilesHtml || '<div style="color: #888;">Keine Strategien gefunden.</div>'}
        `;
    }

    renderDetail(item, onBackCallback) {
        let execTime = '-';
        if (item.entry_date) {
            const d = new Date(item.entry_date);
            if (!isNaN(d.getTime())) {
                const day = String(d.getUTCDate()).padStart(2, '0');
                const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                const year = d.getUTCFullYear();
                const hours = String(d.getUTCHours()).padStart(2, '0');
                const minutes = String(d.getUTCMinutes()).padStart(2, '0');
                const seconds = String(d.getUTCSeconds()).padStart(2, '0');
                
                execTime = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
            }
        }

        this.container.innerHTML = `
            <div style="background: #252525; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                <div style="font-weight: bold; color: #2ecc71; margin-bottom: 10px; font-size: 14px;">
                    Trade Details (ID: ${item.pending_id ?? '-'})
                </div>
                <div style="line-height: 1.8; font-size: 13px;">
                    <div><b>Ticker:</b> ${item.ticker ?? '-'}</div>
                    <div><b>Strategie:</b> ${item.strategy ?? '-'}</div>
                    <div><b>Order ID:</b> ${item.order_id ?? '-'}</div>
                    <div><b>Rolle:</b> ${item.order_role ?? '-'}</div>
                    <div><b>Entry Preis:</b> ${item.entry_price ?? 0}</div>
                    <div><b>Exit Preis:</b> ${item.exit_price ?? 0}</div>
                    <div><b>Stop Preis:</b> ${item.stop_price ?? '-'}</div>
                    <div><b>Menge:</b> ${item.quantity ?? '-'}</div>
                    <div><b>Ausführungszeit:</b> ${execTime}</div>
                    <div><b>Status:</b> ${item.order_status ?? '-'}</div>
                </div>
            </div>
            <button id="analytics-back-btn" style="background: #3498db; color: #fff; border: none; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;">
                ← Zurück zur Übersicht
            </button>
        `;

        const backBtn = this.container.querySelector('#analytics-back-btn');
        if (backBtn && onBackCallback) {
            backBtn.addEventListener('click', onBackCallback);
        }
    }
}