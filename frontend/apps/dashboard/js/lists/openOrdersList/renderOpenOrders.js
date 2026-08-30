import { renderOpenOrdersItem } from './sub-renderers/renderOpenOrdersItem.js';
import { renderOrdersButtons } from './sub-renderers/renderOpenOrdersButtons.js';
import { renderOrdersPills } from './sub-renderers/renderopenOrdersPills.js';

// Globale Soft-Delete-Funktion für einzelne Order-Entwürfe
window.softDeleteOrder = async function(pendingId) {
    if (!confirm("Möchtest du diesen Order-Entwurf wirklich archivieren?")) return;

    try {
        const response = await fetch(`/api/orders/${pendingId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            renderOpenOrders();
        } else {
            console.error("Fehler beim Soft-Delete der Order");
        }
    } catch (err) {
        console.error("Netzwerkfehler beim Soft-Delete:", err);
    }
};

export async function renderOpenOrders() {
    const container = document.getElementById('tools-tab-content');
    if (!container) return;
    container.innerHTML = '<p style="padding:15px; color:#666;">Lade Entwürfe...</p>';

    const state = { filterOrdersDrafts: true };

    try {
        const response = await fetch('/api/orders');
        const allOrders = await response.json();

        // 1. GLOBALER SPEICHER: Alle Orders vorhalten
        if (!window.dataStore) window.dataStore = {};
        window.dataStore.orders = allOrders;

        // 2. FILTERN: Nur DRAFTS für die visuelle Liste
        const draftOrders = allOrders.filter(o => 
            (o.is_active === 1 || o.is_active === true) && 
            (o.status === 'DRAFT' || !o.status)
        );

        // Pill-Counter über den Sub-Renderer aktualisieren
        renderOrdersPills(`${draftOrders.length}`, state);

        // Header-Buttons und Batch-Löschen Callback rendern
        renderOrdersButtons(state, async () => {
            try {
                const deleteResponse = await fetch('/api/orders/batch-delete-last-ten', {
                    method: 'PUT'
                });
                if (deleteResponse.ok) {
                    renderOpenOrders();
                } else {
                    console.error("Fehler beim Batch-Löschen der Orders");
                }
            } catch (err) {
                console.error("Netzwerkfehler beim Batch-Löschen:", err);
            }
        });

        if (draftOrders && draftOrders.length > 0) {
            // Tabellen-Grundgerüst mit CSS-Klasse statt Inline-Styles
            const table = document.createElement("table");
            table.className = "open-orders-table";
            
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>TICKER</th>
                        <th>DIR</th>
                        <th>LIMIT</th>
                        <th>ENTRY</th>
                        <th>SL</th>
                        <th>QTY</th>
                        <th>DEL</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector("tbody");

            // Zeilen über den Sub-Renderer einfügen und Klick-Handler hinzufügen
            draftOrders.forEach(order => {
                const isSelected = order.pending_id === window.selectedPendingId;
                const rowElement = renderOpenOrdersItem(order, isSelected);
                
                // Falls bereits ausgewählt, direkt markieren
                if (isSelected) {
                    rowElement.style.backgroundColor = '#e3f2fd';
                }

                // Klick-Handler für die Zeilenauswahl hinzufügen
                rowElement.style.cursor = 'pointer';
                rowElement.addEventListener('click', () => {
                    document.querySelectorAll('#tools-tab-content tbody tr').forEach(tr => tr.style.backgroundColor = '');
                    rowElement.style.backgroundColor = '#e3f2fd';
                    window.selectedPendingId = order.pending_id;
                });

                tbody.appendChild(rowElement);
            });

            container.innerHTML = '';
            container.appendChild(table);

        } else {
            container.innerHTML = '<p style="padding:20px; color:#666;">Keine Entwürfe vorhanden.</p>';
        }

    } catch (err) {
        console.error("Fehler in renderOpenOrders:", err);
        container.innerHTML = '<p style="color:red; padding:15px;">Fehler beim Laden der Orders.</p>';
    }
}