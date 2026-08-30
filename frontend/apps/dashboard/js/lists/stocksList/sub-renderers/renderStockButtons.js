import { renderWatchlist } from "../../../lists/watchList/renderWatchlist.js";

export function renderStockButtons(state) {
    const btnContainer = document.getElementById("stocks-button-container");
    if (btnContainer) {
        btnContainer.innerHTML = `
            <button class="export-btn" id="btn-to-watchlist" title="Send to Watchlist">
                <svg viewBox="0 0 24 24" style="fill:#6A1B9A; width:20px; height:20px;"><path d="M3 4v16h18V4H3zm2 2h14v12H5V6zm2 2v2h10V8H7zm0 4v2h6v-2H7z"/></svg>
            </button>
            <button class="export-btn" id="export-tv" title="Export for TradingView">
                <svg viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg" style="width:22px; height:18px; vertical-align: middle;">
                    <path d="M14 22H7V11H0V4h14v18zM28 22h-8l7.5-18h8L28 22z" fill="currentColor"/>
                    <circle cx="20" cy="8" r="4" fill="currentColor"/>
                </svg>
            </button>
            <button class="export-btn" id="export-hp" title="Export for Homepage">
                <svg viewBox="0 0 24 24" style="fill:#43A047; width:20px; height:20px;"><path d="M12 3l9 8h-3v10h-12v-10h-3z"/></svg>
            </button>
            <button class="export-btn" id="export-analyse" title="Analysis-Export">
                <svg viewBox="0 0 24 24" style="fill:#FB8C00; width:20px; height:20px;"><path d="M5 4h3v16h-3zm6 6h3v10h-3zm6-4h3v14h-3z"/></svg>
            </button>
        `;
    }

    // 1. Event-Listener für "Send to Watchlist"
    const watchlistBtn = document.getElementById("btn-to-watchlist");
    if (watchlistBtn && !watchlistBtn.dataset.listenerAttached) {
        watchlistBtn.dataset.listenerAttached = "true";
        watchlistBtn.addEventListener("click", () => {
            handleSendToWatchlist(state);
        });
    }

    // 2. Event-Listener für "Export für TradingView"
    const tvExportBtn = document.getElementById("export-tv");
    if (tvExportBtn && !tvExportBtn.dataset.listenerAttached) {
        tvExportBtn.dataset.listenerAttached = "true";
        tvExportBtn.addEventListener("click", () => {
            handleTradingViewExport(state);
        });
    }
}

// Logik zum Übertragen der aktuellen Aktien-Liste in die Watchlist
async function handleSendToWatchlist(state) {
    const selectedItem = document.querySelector("#stocks-list .stock-item.highlight-ticker");
    
    let targetTicker = null;
    let strategyName = state?.strategy || null;

    if (selectedItem) {
        targetTicker = selectedItem.getAttribute("data-stock");
    }

    if (!targetTicker && state?.selectedStock) {
        targetTicker = state.selectedStock;
    }

    if (!targetTicker) {
        console.warn("Kein Ticker ausgewählt. Bitte klicke zuerst auf eine Aktie in der Liste.");
        showToast('Kein Ticker ausgewählt', 'error');
        return;
    }

    const stockData = state?.lastProcessedStocks?.find(s => s.ticker === targetTicker);

    const payload = {
        ticker: targetTicker,
        date: new Date().toISOString().split('T')[0],
        strategy_name: strategyName,
        setup_high: stockData?.high || stockData?.setup_high || null,
        setup_low: stockData?.low || stockData?.setup_low || null,
        market_context_id: stockData?.market_context_id || null
    };

    console.log("Sende Ticker an Watchlist-DB:", payload);

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
        console.log("Erfolgreich gespeichert:", result);

        if (window.dataStore) {
            window.dataStore.watchlist = null;
        }

        const activeTabItem = document.querySelector(".tab-header .tab-item.active");
        const tabContent = document.getElementById("tools-tab-content");
        
        if (activeTabItem && activeTabItem.getAttribute("data-tab") === "watchlist" && tabContent) {
            await renderWatchlist(state, tabContent);
        }

        // Erfolgsmeldung direkt über den Buttons
        showToast('Watchlist aktualisiert', 'success');

    } catch (error) {
        console.error("DB-Speicherfehler:", error);
        showToast('Fehler beim Speichern', 'error');
    }
}

// Logik für den TradingView Export inklusive Toast-Feedback
async function handleTradingViewExport(state) {
    const exportData = state?.lastProcessedStocks || [];
    const strategyName = state?.strategy || 'TV_custom_select';

    const payload = {
        type: 'TV_CUSTOM_SELECT',
        data: exportData,
        options: {
            meta: {
                strategy: strategyName,
                sector: state?.sector || '-',
                industry: state?.industry || '-',
                index: state?.index || '-'
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
            showToast(`${result.count} Titel exportiert zu TV`, 'success');
        } else {
            showToast('Fehler beim TV-Export', 'error');
        }
    } catch (err) {
        console.error("Export-Netzwerkfehler:", err);
        showToast('Netzwerkfehler beim TV-Export', 'error');
    }
}

// Zentrale Toast-Hilfsfunktion (positioniert direkt über dem Button-Container)
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
        
        const btnContainer = document.getElementById("stocks-button-container");
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