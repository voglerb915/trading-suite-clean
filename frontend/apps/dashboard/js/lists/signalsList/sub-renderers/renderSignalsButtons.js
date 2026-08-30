import { renderWatchlist } from "../../../lists/watchList/renderWatchlist.js";

export function renderSignalsButtons(state) {
    const btnContainer = document.getElementById("tools-button-container");
    
    if (btnContainer) {
        // Direktes Neusetzen erzwingen, damit beim Tab-Wechsel 
        // sofort exakt die 2 Buttons für Signals daschmisten werden
        btnContainer.innerHTML = `
            <button class="export-btn" id="btn-to-watchlist-from-signal" title="Send to Watchlist">
                <svg viewBox="0 0 24 24" style="fill:#6A1B9A; width:20px; height:20px;"><path d="M3 4v16h18V4H3zm2 2h14v12H5V6zm2 2v2h10V8H7zm0 4v2h6v-2H7z"/></svg>
            </button>
            <button class="export-btn" id="export-tv-signal" title="Export for TradingView">
                <svg viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg" style="width:22px; height:18px; vertical-align: middle;">
                    <path d="M14 22H7V11H0V4h14v18zM28 22h-8l7.5-18h8L28 22z" fill="currentColor"/>
                    <circle cx="20" cy="8" r="4" fill="currentColor"/>
                </svg>
            </button>
        `;
    }

    const watchlistBtn = document.getElementById("btn-to-watchlist-from-signal");
    if (watchlistBtn && !watchlistBtn.dataset.listenerAttached) {
        watchlistBtn.dataset.listenerAttached = "true";
        watchlistBtn.addEventListener("click", () => {
            handleSendToWatchlistFromSignal(state);
        });
    }

    // Event-Listener für TradingView Export (Signals) ergänzt
    const tvExportBtn = document.getElementById("export-tv-signal");
    if (tvExportBtn && !tvExportBtn.dataset.listenerAttached) {
        tvExportBtn.dataset.listenerAttached = "true";
        tvExportBtn.addEventListener("click", () => {
            handleTradingViewExport(state);
        });
    }
}

async function handleSendToWatchlistFromSignal(state) {
    const selectedItem = document.querySelector("#tools-tab-content .signal-item.highlight-ticker") || document.querySelector("#tools-tab-content tr.highlight");
    
    let targetTicker = null;
    let strategyName = state?.strategy || null;

    if (selectedItem) {
        targetTicker = selectedItem.getAttribute("data-ticker") || selectedItem.getAttribute("data-stock");
    }

    if (!targetTicker) {
        console.warn("Kein Signal-Ticker ausgewählt. Bitte klicke zuerst auf ein Signal in der Liste.");
        showToast('Kein Ticker ausgewählt', 'error');
        return;
    }

    const signalData = state?.lastProcessedSignals?.find(s => s.ticker === targetTicker);

    const payload = {
        ticker: targetTicker,
        date: new Date().toISOString().split('T')[0],
        strategy_name: strategyName,
        setup_high: signalData?.high || null,
        setup_low: signalData?.low || null,
        market_context_id: signalData?.market_context_id || null
    };

    try {
        const response = await fetch('/api/watchlist/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Fehler beim Speichern in der Watchlist-Datenbank');
        }

        const result = await response.json();

        if (window.dataStore) {
            window.dataStore.watchlist = null;
        }

        const activeTabItem = document.querySelector(".tab-header .tab-item.active");
        const tabContent = document.getElementById("tools-tab-content");
        
        if (activeTabItem && activeTabItem.getAttribute("data-tab") === "watchlist" && tabContent) {
            await renderWatchlist(state, tabContent);
        }

        console.log("Erfolgreich zur Watchlist hinzugefügt via Signal:", result);
        showToast('Watchlist aktualisiert', 'success');

    } catch (error) {
        console.error("DB-Speicherfehler:", error);
        showToast('Fehler beim Speichern', 'error');
    }
}

// Logik für den TradingView Export der Signale
async function handleTradingViewExport(state) {
    // 1. Hole die aktuell sichtbaren Ticker in exakter Reihenfolge (von oben nach unten) aus dem DOM
    const visibleItems = document.querySelectorAll("#tools-tab-content .signal-item, #tools-tab-content tr");
    const orderedTickers = [];

    visibleItems.forEach(item => {
        const ticker = item.getAttribute("data-ticker") || item.getAttribute("data-stock");
        if (ticker && !orderedTickers.includes(ticker)) {
            orderedTickers.push(ticker);
        }
    });

    // 2. Mappe die Ticker auf die originalen Signal-Daten, behalte aber die visuelle Sortierung bei
    const rawData = state?.lastProcessedSignals || [];
    const sortedExportData = orderedTickers
        .map(ticker => rawData.find(s => s.ticker === ticker))
        .filter(Boolean);

    // Fallback falls DOM leer sein sollte, sonst die sortierte Liste nehmen
    const finalExportList = sortedExportData.length > 0 ? sortedExportData : rawData;

    // 3. Auf max. 200 Einträge limitieren, um den "Payload Too Large"-Fehler zu verhindern
    const exportData = finalExportList.slice(0, 200);

    if (finalExportList.length > 200) {
        console.warn(`Export auf 200 von ${finalExportList.length} sortierten Tickers limitiert.`);
    }

    const payload = {
        type: 'TV_CUSTOM_SELECT',
        data: exportData,
        options: {
            meta: {
                source: 'signals',
                strategy: state?.strategy || 'TV_signals'
            }
        }
    };

    try {
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast(`${result.count || exportData.length} Signale (nach Sortierung) exportiert zu TV`, 'success');
        } else {
            showToast('Fehler beim TV-Export', 'error');
        }
    } catch (err) {
        console.error("Export-Netzwerkfehler:", err);
        showToast('Netzwerkfehler beim TV-Export', 'error');
    }
}

// Zentrale Toast-Hilfsfunktion
function showToast(message, type = 'success') {
    let toast = document.getElementById('frontend-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'frontend-toast';
        toast.style.cssText = `
            position: absolute;
            bottom: 45px;
            right: 0;
            background: #1e1e1e;
            color: #fff;
            padding: 8px 14px;
            border-radius: 6px;
            font-size: 0.8rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            border-left: 4px solid #00c853;
            z-index: 10000;
            transition: opacity 0.3s ease;
            white-space: nowrap;
        `;
        
        const btnContainer = document.getElementById("tools-button-container");
        if (btnContainer) {
            if (getComputedStyle(btnContainer).position === 'static') {
                btnContainer.style.position = 'relative';
            }
            btnContainer.appendChild(toast);
        } else {
            document.body.appendChild(toast);
        }
    }

    toast.style.borderLeftColor = type === 'success' ? '#00c853' : '#ff5252';
    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}