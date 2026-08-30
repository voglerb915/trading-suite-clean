export function renderActiveOrdersButtons(state, onDeleteLastTenCallback) {
    const btnContainer = document.getElementById("tools-button-container");
    if (btnContainer) {
        btnContainer.innerHTML = `
            <button class="export-btn" id="export-active-orders-tv" title="Export Active Orders for TradingView">
                <svg viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg" style="width:22px; height:18px; vertical-align: middle;">
                    <path d="M14 22H7V11H0V4h14v18zM28 22h-8l7.5-18h8L28 22z" fill="currentColor"/>
                    <circle cx="20" cy="8" r="4" fill="currentColor"/>
                </svg>
            </button>
            <button class="export-btn" id="delete-last-ten-orders-btn" title="Letzte 10 Orders löschen">
                <svg viewBox="0 0 24 24" style="fill:#e74c3c; width:20px; height:20px; vertical-align: middle;">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
    }

    // 1. Event-Listener für "Export für TradingView"
    const tvExportBtn = document.getElementById("export-active-orders-tv");
    if (tvExportBtn && !tvExportBtn.dataset.listenerAttached) {
        tvExportBtn.dataset.listenerAttached = "true";
        tvExportBtn.addEventListener("click", () => {
            handleTradingViewExport(state);
        });
    }

    // 2. Event-Listener für den "Letzte 10 löschen"-Button
    const deleteBtn = document.getElementById("delete-last-ten-orders-btn");
    if (deleteBtn && !deleteBtn.dataset.listenerAttached) {
        deleteBtn.dataset.listenerAttached = "true";
        deleteBtn.addEventListener("click", () => {
            if (typeof onDeleteLastTenCallback === "function") {
                onDeleteLastTenCallback();
            }
        });
    }
}

// Logik für den TradingView Export der Active Orders inklusive Toast-Feedback
async function handleTradingViewExport(state) {
    const exportData = window.dataStore?.activeOrders || [];

    const payload = {
        type: 'TV_CUSTOM_SELECT', // Auf den vom Backend erwarteten Typ angepasst
        data: exportData,
        options: {
            meta: {
                source: 'active_orders'
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
            showToast(`${result.count || exportData.length} aktive Orders exportiert zu TV`, 'success');
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