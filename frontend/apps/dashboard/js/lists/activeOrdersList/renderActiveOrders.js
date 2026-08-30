import { renderActiveOrdersItem } from './sub-renderers/renderActiveOrdersItem.js';
import { renderActiveOrdersPills } from './sub-renderers/renderActiveOrdersPills.js';
import { renderActiveOrdersButtons } from './sub-renderers/renderActiveOrdersButtons.js';

// State außerhalb halten, damit er beim Neu-Rendern durch Klicks erhalten bleibt
const state = { filterStatus: null };

// --- ROBUSTE LIVE-AKTUALISIERUNG VIA SSE ---
let eventSource = null;

export function initSSE() {
    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource('http://localhost:4000/api/ibkr/events');

    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'REFRESH_ORDERS') {
                console.log("⚡ Live-Update empfangen: Aktualisiere aktive Orders...");
                renderActiveOrders(); 
            }
        } catch (err) {
            console.error("Fehler beim Verarbeiten des SSE-Events:", err);
        }
    };

    eventSource.onerror = function() {
        if (eventSource) {
            eventSource.close();
        }
        setTimeout(initSSE, 3000);
    };
}

// Globale Soft-Delete-Funktion für Active Orders (Zielt NUR auf ExecutedOrders)
window.deleteActiveOrder = async function(pendingId) {
    if (!confirm("Möchtest du diese aktive Order wirklich archivieren?")) return;

    try {
        const response = await fetch(`/api/orders/executed/${pendingId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            renderActiveOrders();
        } else {
            console.error("Fehler beim Soft-Delete der Active Order");
        }
    } catch (err) {
        console.error("Netzwerkfehler beim Soft-Delete:", err);
    }
};

export async function renderActiveOrders() {
    const container = document.getElementById('tools-tab-content');
    if (!container) return;
    
    container.innerHTML = '<p style="padding:15px; color:#666;">Synchronisiere mit IBKR...</p>';

    try {
        const response = await fetch('/api/orders/active');
        const rawData = await response.json();
        
        const activeOrders = Array.isArray(rawData) ? rawData : (rawData.data || rawData.orders || []);

        if (!window.dataStore) window.dataStore = {};
        window.dataStore.activeOrders = activeOrders;

        renderActiveOrdersPills(activeOrders, state);
        setupPillEventListeners();

        container.innerHTML = '';

        renderActiveOrdersButtons(state, async () => {
            if (confirm("Möchtest du wirklich die letzten 10 Executed Orders als Soft-Delete markieren?")) {
                try {
                    const deleteResponse = await fetch('/api/orders/batch-delete-executed-last-ten', {
                        method: 'PUT'
                    });
                    if (deleteResponse.ok) {
                        renderActiveOrders(); 
                    } else {
                        console.error("Fehler beim Batch-Löschen der Executed Orders");
                    }
                } catch (err) {
                    console.error("Netzwerkfehler beim Batch-Löschen:", err);
                }
            }
        });

        const filteredOrders = activeOrders.filter(order => {
            if (!state.filterStatus) return true; 
            const s = (order.status || '').toLowerCase();
            
            if (state.filterStatus === 'submitted') return s.includes('submit');
            if (state.filterStatus === 'executed') return s.includes('exec') || s.includes('fill');
            if (state.filterStatus === 'canceled') return s.includes('cancel');
            return true;
        });

        if (filteredOrders && filteredOrders.length > 0) {
            const table = document.createElement("table");
            table.className = "active-orders-table";

            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>TICKER</th>
                        <th>IB</th>
                        <th>STATUS</th>
                        <th>DATE</th>
                        <th>DEL</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector("tbody");

            filteredOrders.forEach(order => {
                const isSelected = order.ticker === window.selectedActiveOrderTicker;
                const rowElement = renderActiveOrdersItem(order, isSelected);
                tbody.appendChild(rowElement);
            });

            container.appendChild(table);

        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = 'padding: 20px; color: #666; text-align: center; background: white; border-radius: 4px;';
            emptyMsg.textContent = 'Keine aktiven Orders für diesen Filter vorhanden.';
            container.appendChild(emptyMsg);
        }

    } catch (err) {
        console.error("Fehler in renderActiveOrders:", err);
        container.innerHTML = '<p style="color:red; padding:15px;">Fehler beim Laden der aktiven Orders.</p>';
    }
}

function setupPillEventListeners() {
    const pillContainer = document.getElementById("tools-pill-container");
    if (!pillContainer || pillContainer.dataset.listenerAttached) return;

    pillContainer.dataset.listenerAttached = "true";

    pillContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-filter]');
        if (!pill) return;

        const selectedFilter = pill.getAttribute('data-filter');

        if (state.filterStatus === selectedFilter) {
            state.filterStatus = null;
        } else {
            state.filterStatus = selectedFilter;
        }

        if (window.dataStore && window.dataStore.activeOrders) {
            renderActiveOrdersPills(window.dataStore.activeOrders, state);
            renderActiveOrders(); 
        }
    });
}