export function renderWatchlistButtons(state, onDeleteLastTenCallback) {
    const btnContainer = document.getElementById("tools-button-container");
    if (btnContainer) {
        btnContainer.innerHTML = `
            <button class="export-btn" id="export-watchlist-tv" title="Export Watchlist for TradingView">
                <svg viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg" style="width:22px; height:18px; vertical-align: middle;">
                    <path d="M14 22H7V11H0V4h14v18zM28 22h-8l7.5-18h8L28 22z" fill="currentColor"/>
                    <circle cx="20" cy="8" r="4" fill="currentColor"/>
                </svg>
            </button>
            <button class="export-btn" id="export-watchlist-analyse" title="Watchlist Analysis">
                <svg viewBox="0 0 24 24" style="fill:#FB8C00; width:20px; height:20px;"><path d="M5 4h3v16h-3zm6 6h3v10h-3zm6-4h3v14h-3z"/></svg>
            </button>
            <button class="export-btn" id="delete-last-ten-btn" title="Letzte 10 Einträge löschen">
                <svg viewBox="0 0 24 24" style="fill:#e74c3c; width:20px; height:20px; vertical-align: middle;">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
    }

    // 1. Event-Listener für TradingView Export (Watchlist)
    const tvExportBtn = document.getElementById("export-watchlist-tv");
    if (tvExportBtn && !tvExportBtn.dataset.listenerAttached) {
        tvExportBtn.dataset.listenerAttached = "true";
        tvExportBtn.addEventListener("click", () => {
            handleTradingViewExport(state);
        });
    }

    // 2. Event-Listener für den "Letzte 10 löschen"-Button
    const deleteBtn = document.getElementById("delete-last-ten-btn");
    if (deleteBtn && !deleteBtn.dataset.listenerAttached) {
        deleteBtn.dataset.listenerAttached = "true";
        deleteBtn.addEventListener("click", () => {
            if (confirm("Möchtest du wirklich die letzten 10 Einträge aus der Watchlist löschen?")) {
                if (typeof onDeleteLastTenCallback === "function") {
                    onDeleteLastTenCallback();
                }
            }
        });
    }
}

// Logik für den TradingView Export der Watchlist inklusive Toast-Feedback
async function handleTradingViewExport(state) {
    const exportData = window.dataStore?.watchlist || [];

    const payload = {
        type: 'TV_CUSTOM_SELECT',
        data: exportData,
        options: {
            meta: {
                source: 'watchlist'
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
            showToast(`${result.count || exportData.length} Watchlist-Einträge exportiert zu TV`, 'success');
        } else {
            showToast('Fehler beim TV-Export', 'error');
        }
    } catch (err) {
        console.error("Export-Netzwerkfehler:", err);
        showToast('Netzwerkfehler beim TV-Export', 'error');
    }
}

// Zentrale Toast-Hilfsfunktion (positioniert über dem Button-Container)
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