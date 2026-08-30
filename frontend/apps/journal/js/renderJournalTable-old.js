// apps/lab/render/renderJournalTable.js

import { fmt } from "../../../shared/utils/format.js";
import GlobalState from "../../../shared/state/globalState.js";

export function renderJournalTable(trades) {
    const container = document.getElementById("journal-root");

    if (!container) return;

    const cols = "1.1fr 0.5fr 0.7fr 0.5fr 0.7fr 0.7fr 0.5fr 0.5fr 1.2fr 1.2fr";

    container.innerHTML = `
        <div id="journal-table" style="font-family: sans-serif; position: relative;">
            
            <div style="position: sticky; top: 0; z-index: 100; background: #121212; padding-top: 20px;">
                
                <h2 style="font-size: 1rem; color: #ffa500; margin: 0; padding: 0 5px 8px 5px; text-transform: uppercase; letter-spacing: 1px; background: #121212;">
                    Executed Trades
                </h2>

                <div style="display:grid; grid-template-columns:${cols}; font-weight:bold; color:#888; border-bottom:1px solid #444; padding:8px 5px; font-size: 0.85rem; text-transform: uppercase; background: #1a1a1a;">
                    <div>Datum/Zeit</div>
                    <div>ID</div>
                    <div>Ticker</div>
                    <div>PID</div>
                    <div style="text-align:right;">Entry</div>
                    <div style="text-align:right;">Exit</div>
                    <div style="text-align:right;">Qty</div>
                    <div style="text-align:right;">R</div>
                    <div style="text-align:right;">Status</div>
                    <div style="text-align:center;">Strat</div>
                </div>
            </div>

            <div id="journal-rows" style="background: #121212;">

                ${trades.map((t, index) => {
                    
                    // Datum/Zeit
                    const execDate = t.entry_date ? new Date(t.entry_date) : null;
                    const dateStr = execDate ? execDate.toLocaleDateString('de-DE') : '---';
                    const timeStr = execDate ? execDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';

                    // Status-Farbe
                    const status = (t.order_status || "").toLowerCase();
                    let statusColor = '#ffa500';
                    if (status.includes('fill') || status.includes('exec')) statusColor = '#00ff00';
                    else if (status.includes('cancel')) statusColor = '#666666';

                    // Preise
                    const ePrice = Number(t.entry_price || 0);
                    const xPrice = Number(t.exit_price || 0);
                    const sPrice = Number(t.stop_price || 0);

                    // R-Berechnung
                    let rDisplay = "-";
                    let rColor = "#666";

                    if ((t.order_role === 'EXIT' || t.ORDER_ROLE === 'EXIT') && xPrice > 0) {
                        const entryTrade = trades.find(item =>
                            item.pending_id === t.pending_id &&
                            (item.order_role === 'ENTRY' || item.ORDER_ROLE === 'ENTRY')
                        );

                        if (entryTrade && Number(entryTrade.entry_price) > 0 && sPrice > 0) {
                            const entry = Number(entryTrade.entry_price);
                            const risk = Math.abs(entry - sPrice);

                            if (risk > 0) {
                                const rValue = (xPrice - entry) / risk;
                                rDisplay = rValue.toFixed(2);
                                rColor = rValue >= 0 ? "#00ff00" : "#ff4444";
                            }
                        }
                    }

                    // Gruppierungslinie
                    const isLastOfGroup = trades[index + 1] && trades[index + 1].pending_id !== t.pending_id;
                    const borderBottom = isLastOfGroup ? '2px solid #444' : '1px solid #222';
                    
                    return `
                    <div style="display:grid; grid-template-columns:${cols}; border-bottom:${borderBottom}; padding:6px 5px; color:#fff; font-size: 0.9rem; align-items:center; background: #121212;">
                        
                        <div style="line-height: 1.2;">
                            <div style="color:#aaa; font-size: 0.8rem;">${dateStr}</div>
                            <div style="color:#666; font-size: 0.7rem;">${timeStr}</div>
                        </div>

                        <div style="color:#555; font-size: 0.75rem;">${t.order_id || '---'}</div>
                        <div style="font-weight:bold; color:#fff;">${t.ticker || '---'}</div>
                        <div style="color:#666; font-size: 0.75rem;">${t.pending_id || '---'}</div>

                        <div style="text-align:right;">${ePrice > 0 ? fmt.price(ePrice) : "---"}</div>
                        <div style="text-align:right; color:#58a6ff;">${xPrice > 0 ? fmt.price(xPrice) : "---"}</div>

                        <div style="text-align:right; color:#bbb;">${t.quantity || '---'}</div>

                        <div style="text-align:right; color:${rColor}; font-weight:bold;">${rDisplay}</div>

                        <div style="text-align:right; color:${statusColor}; font-weight:bold; font-size: 0.8rem; text-transform: uppercase;">
                            ${t.order_status || 'N/A'}
                        </div>

                        <div style="text-align:center;">
                            <span style="background: rgba(255,165,0,0.1); color: #ffa500; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; border: 1px solid rgba(255,165,0,0.15); white-space: nowrap;">
                                ${t.strategy || 'N/A'}
                            </span>
                        </div>

                    </div>`;
                }).join('')}
            </div>
        </div>`;
}
