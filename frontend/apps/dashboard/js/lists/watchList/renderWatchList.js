import { renderWatchlistItem } from "./sub-renderers/renderWatchlistItem.js";
import { StrategySelector } from "./sub-renderers/strategySelector.js";
import { OrderEditorModal } from "./sub-renderers/orderEditorModal.js";
import { TextModal } from "./sub-renderers/textModal.js";
// 🟢 Neue Imports für Pills und Buttons
import { renderWatchlistPills } from "./sub-renderers/renderWatchListPills.js";
import { renderWatchlistButtons } from "./sub-renderers/renderWatchListButtons.js";

const strategySelector = new StrategySelector();
const orderEditorModal = new OrderEditorModal();
const textModal = new TextModal();

let globalContainerRef = null;

function setupGlobalDelegation(container) {
    if (globalContainerRef === container) return;
    globalContainerRef = container;

    container.addEventListener("click", async (event) => {
        // 1. SCHRITT: Shopping Cart (Order Editor Modal)
        const cartBtn = event.target.closest(".cart-btn");
        if (cartBtn) {
            event.stopPropagation();
            event.preventDefault();

            const row = cartBtn.closest("tr");
            const recordId = row ? row.getAttribute("data-id") : cartBtn.getAttribute("data-id");

            let watchlistData = window.dataStore?.watchlist || [];
            const item = watchlistData.find(d => String(d.id) === String(recordId));

            if (item) {
                orderEditorModal.show(item, async (orderData) => {
                    try {
                        if (window.dataStore) {
                            window.dataStore.watchlist = null;
                        }
                        await renderWatchlist(window.currentDashboardState || {}, container);
                    } catch (err) {
                        console.error("Ansicht-Aktualisierungsfehler:", err);
                    }
                });
            }
            return;
        }

        // 2. SCHRITT: Strategy Selector
        const strategyEl = event.target.closest(".strategy-text");
        if (strategyEl) {
            event.stopPropagation();
            event.preventDefault();
            
            const row = strategyEl.closest("tr");
            const recordId = row ? row.getAttribute("data-id") : null;
            const currentStrategy = strategyEl.getAttribute("data-strategy") || strategyEl.textContent.trim() || "none";

            if (!recordId) return;

            strategySelector.show(event, currentStrategy, async (newStrategy) => {
                try {
                    const response = await fetch(`/api/watchlist/${recordId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ strategy: newStrategy })
                    });

                    if (!response.ok) throw new Error("Fehler beim Aktualisieren der Strategie");

                    document.querySelectorAll("iframe").forEach(iframe => {
                        iframe.contentWindow.postMessage({ type: "WATCHLIST_UPDATED" }, "*");
                    });

                    if (window.dataStore) {
                        window.dataStore.watchlist = null;
                    }
                    await renderWatchlist(window.currentDashboardState || {}, container);

                } catch (err) {
                    console.error("Strategie-Update Fehler:", err);
                }
            });
            return;
        }

        // 3. SCHRITT: Text Modal (Notizen / Kommentare)
        const textBtn = event.target.closest(".note-icon");
        if (textBtn) {
            event.stopPropagation();
            event.preventDefault();

            const row = textBtn.closest("tr");
            const recordId = row ? row.getAttribute("data-id") : textBtn.getAttribute("data-id");

            let watchlistData = window.dataStore?.watchlist || [];
            const item = watchlistData.find(d => String(d.id) === String(recordId));

            if (item) {
                textModal.show(item, async (updatedNotes) => {
                    try {
                        const response = await fetch(`/api/watchlist/${recordId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_notes: updatedNotes })
                        });

                        if (!response.ok) throw new Error("Fehler beim Speichern der Notiz");

                        if (window.dataStore) {
                            window.dataStore.watchlist = null;
                        }
                        await renderWatchlist(window.currentDashboardState || {}, container);
                    } catch (err) {
                        console.error("Notiz-Update Fehler:", err);
                    }
                });
            }
            return;
        }

        // 4. SCHRITT: Delete Button (Soft-Delete)
        const deleteBtn = event.target.closest(".delete-btn");
        if (deleteBtn) {
            event.stopPropagation();
            event.preventDefault();

            const row = deleteBtn.closest("tr");
            const recordId = row ? row.getAttribute("data-id") : deleteBtn.getAttribute("data-id");

            if (!recordId) return;

            if (confirm("Eintrag wirklich aus der Watchlist entfernen?")) {
                try {
                    const response = await fetch(`/api/watchlist/${recordId}`, {
                        method: 'DELETE'
                    });

                    const responseData = await response.json();
                    if (!response.ok) throw new Error(responseData.error || "Fehler beim Löschen");

                    if (window.dataStore) {
                        window.dataStore.watchlist = null;
                    }
                    await renderWatchlist(window.currentDashboardState || {}, container);
                } catch (err) {
                    console.error("Lösch-Fehler:", err);
                }
            }
            return;
        }
    });
}


export async function renderWatchlist(state, container) {
    window.currentDashboardState = state;
    setupGlobalDelegation(container);

    container.innerHTML = `<div class="loading-spinner">Lade Watchlist...</div>`;

    try {
        let watchlistData = state.watchlist || window.dataStore?.watchlist;

        if (!watchlistData) {
            const response = await fetch('/api/watchlist');
            if (!response.ok) throw new Error("Fehler beim Laden der Watchlist");
            watchlistData = await response.json();
            
            if (window.dataStore) {
                window.dataStore.watchlist = watchlistData;
            }
        }

        container.innerHTML = "";

// 🟢 Pills und Buttons direkt nach dem Laden rendern (mit Lösch-Callback für die letzten 10)
        renderWatchlistPills(watchlistData.length, state);
        renderWatchlistButtons(state, async () => {
            try {
                const response = await fetch('/api/watchlist/delete-last-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: 10 })
                });

                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.error || "Fehler beim Löschen der Einträge");

                if (window.dataStore) {
                    window.dataStore.watchlist = null;
                }
                await renderWatchlist(window.currentDashboardState || {}, container);
            } catch (err) {
                console.error("Batch-Lösch-Fehler:", err);
            }
        });

        const table = document.createElement("table");
        table.className = "watchlist-table data-table";

        table.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>TICKER</th>
                    <th>OC</th>
                    <th>STRATEGY</th>
                    <th>CREATED</th>
                    <th>DEL</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector("tbody");

        watchlistData.exports?.forEach ? null : watchlistData.forEach((item) => {
            const tr = renderWatchlistItem(item, state);
            tbody.appendChild(tr);
        });

        container.appendChild(table);

    } catch (err) {
        console.error("Watchlist Render Error:", err);
        container.innerHTML = `
            <div class="error-box">
                <p>Fehler beim Laden der Watchlist: ${err.message}</p>
            </div>
        `;
    }
}