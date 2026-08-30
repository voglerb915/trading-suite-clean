/*----------------------------------
1. Globaler State
----------------------------------*/
const GlobalState = {
    volumeData: [],
    journalData: [],
    sortConfig: { key: null, direction: 'desc' } // 'desc' für absteigend, 'asc' für aufsteigend
};

/*----------------------------------
2. Data-Layer
----------------------------------*/
async function fetchVolumeData() {
    const res = await fetch("/api/volume-metrics");
    if (!res.ok) throw new Error("Fehler Volume API");
    return await res.json();
}

async function fetchJournalData() {
    const res = await fetch("/api/journal/executed");
    if (!res.ok) throw new Error("Fehler Journal API");
    return await res.json();
}

/*----------------------------------
3. Navigation (Dashboard-Interne Ansichten)
----------------------------------*/
// Aktuell keine internen Ansichten definiert

/*----------------------------------
4. UI-Layer (Rendering)
----------------------------------*/
function renderVolumeTable(list) {
    const container = document.getElementById("col-1");
    if (!container) return;

    const cols = "0.5fr 0.8fr 0.8fr 0.8fr 1.5fr 1.1fr";
    
    // Hilfsfunktion für das Sortier-Icon
    const getIcon = (key) => {
        if (GlobalState.sortConfig.key !== key) return '<span style="color:#444; margin-left:3px;">↕</span>';
        return GlobalState.sortConfig.direction === 'desc' 
            ? '<span style="color:#ffa500; margin-left:3px;">↓</span>' 
            : '<span style="color:#ffa500; margin-left:3px;">↑</span>';
    };

    container.innerHTML = `
        <div id="volume-table-container" style="font-family: sans-serif; position: relative;">
            <div style="position: sticky; top: 0; z-index: 100; background: #121212; padding-top: 20px;">
                <h2 style="font-size: 1rem; color: #ffa500; margin: 0; padding: 0 5px 8px 5px; text-transform: uppercase; letter-spacing: 1px;">
                    Huge Volume <span style="color: #58a6ff; font-size: 0.7rem; text-transform: none;">(Min. 10M Umsatz)</span>
                </h2>
                
                <div style="display:grid; grid-template-columns:${cols}; font-weight:bold; color:#888; border-bottom:1px solid #444; padding:8px 5px; font-size: 0.85rem; text-transform: uppercase; background: #1a1a1a;">
                    <div>R#</div>
                    <div>Ticker</div>
                    <div style="text-align:right;">Preis</div>
                    <div style="text-align:right; cursor:pointer; color:#58a6ff;" onclick="handleSort('ratio')">
                        Ratio ${getIcon('ratio')}
                    </div>
                    <div style="text-align:right; cursor:pointer; color:#58a6ff;" onclick="handleSort('volume')">
                        Volumen ${getIcon('volume')}
                    </div>
                    <div style="text-align:right; cursor:pointer; color:#58a6ff;" onclick="handleSort('turnover')">
                        Umsatz ${getIcon('turnover')}
                    </div>
                </div>
            </div>

            <div id="volume-rows" style="background: #121212;">
                ${list.map((item, idx) => `
                    <div style="display:grid; grid-template-columns:${cols}; border-bottom:1px solid #222; padding:6px 5px; color:#fff; font-size: 0.9rem; align-items:center;">
                        <div style="color:#ffa500; font-size: 0.8rem;">${idx + 1}.</div>
                        <div style="font-weight:bold;">${item.ticker}</div>
                        <div style="text-align:right;">${item.close ? Number(item.close).toFixed(2) : '0.00'} $</div>
                        <div style="text-align:right; color: #00ff00;">${item.ratio ? item.ratio.toFixed(1) : '0'}x</div>
                        <div style="text-align:right; color: #aaa;">${Number(item.volume).toLocaleString('de-DE')}</div>
                        <div style="text-align:right; color:#58a6ff;">${Math.round(item.turnover/1000000)}M $</div>
                    </div>`).join('')}
            </div>
        </div>`;
}

function renderJournalTable(trades) {
    const container = document.getElementById("col-2");
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
                    // ... (Deine bestehende Logik für Zeit, Status, Preise und R)
                    const execDate = t.entry_date ? new Date(t.entry_date) : null;
                    const dateStr = execDate ? execDate.toLocaleDateString('de-DE') : '---';
                    const timeStr = execDate ? execDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
                    const status = (t.order_status || "").toLowerCase();
                    let statusColor = '#ffa500'; 
                    if (status.includes('fill') || status.includes('exec')) statusColor = '#00ff00';
                    else if (status.includes('cancel')) statusColor = '#666666';
                    const ePrice = Number(t.entry_price || 0);
                    const xPrice = Number(t.exit_price || 0);
                    const sPrice = Number(t.stop_price || 0);

                    let rDisplay = "-";
                    let rColor = "#666";
                    if ((t.order_role === 'EXIT' || t.ORDER_ROLE === 'EXIT') && xPrice > 0) {
                        const entryTrade = trades.find(item => item.pending_id === t.pending_id && (item.order_role === 'ENTRY' || item.ORDER_ROLE === 'ENTRY'));
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
                        <div style="text-align:right;">${ePrice > 0 ? ePrice.toFixed(2) : "---"}</div>
                        <div style="text-align:right; color:#58a6ff;">${xPrice > 0 ? xPrice.toFixed(2) : "---"}</div>
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

/*----------------------------------
5. Controller
----------------------------------*/
async function initDashboard() {
    try {
        // 1. Rohdaten vom Backend holen
        const rawVolumeData = await fetchVolumeData();

        // 2. HARTER FILTER: Nur Ticker mit Umsatz >= 10 Mio. $
        const filteredVolumeData = rawVolumeData.filter(item => {
            const turnoverM = (item.turnover || 0) / 1000000;
            return turnoverM >= 10;
        });

        // 3. Globalen State setzen
        GlobalState.volumeData = filteredVolumeData;
        
        // 4. UI rendern
        renderVolumeTable(GlobalState.volumeData);

        // Journal laden
        const jData = await fetchJournalData();
        GlobalState.journalData = jData;
        renderJournalTable(jData);

    } catch (err) {
        console.error("Controller Error:", err);
    }
}

function handleSort(key) {
    const config = GlobalState.sortConfig;
    if (config.key === key) {
        config.direction = config.direction === 'desc' ? 'asc' : 'desc';
    } else {
        config.key = key;
        config.direction = 'desc';
    }

    GlobalState.volumeData.sort((a, b) => {
        const valA = a[key] || 0;
        const valB = b[key] || 0;
        return config.direction === 'desc' ? valB - valA : valA - valB;
    });

    renderVolumeTable(GlobalState.volumeData);
}

window.handleSort = handleSort;
// Damit die Funktion global für das onclick verfügbar ist:
window.handleSort = handleSort;

/*----------------------------------
6. Event-Handler
----------------------------------*/
// Hier können Klick-Events für Ticker etc. rein

/*----------------------------------
7. Initialisierung
----------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
    console.log("LAB: Start...");
    initDashboard();
});