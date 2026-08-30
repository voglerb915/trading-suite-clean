import { renderRankCircle } from "../../../helpers/renderHelpers.js";

export function renderOpenOrdersItem(order, isSelected) {
    const rowBgColor = isSelected ? '#fff3e0' : 'white';

    const displayLimit = (order.limit_price && order.limit_price != 0) 
        ? parseFloat(order.limit_price).toFixed(2) 
        : '—';

    const tr = document.createElement("tr");
    tr.className = `order-row ${isSelected ? 'highlight-order' : ''}`;
    tr.style.cssText = `border-bottom: 1px solid #eee; background-color: ${rowBgColor}; cursor: pointer;`;
    
    // Klick-Handler für Selektion
    tr.onclick = function() {
        window.selectedOrderTicker = order.ticker;
        document.querySelectorAll('#tools-tab-content .order-row').forEach(r => r.style.backgroundColor = 'white');
        this.style.backgroundColor = '#fff3e0';
    };

    const isLong = order.direction && order.direction.toLowerCase() === 'long';

    tr.innerHTML = `
        <td style="text-align: center;">
            ${renderRankCircle(order.pending_id, window.dataStore?.sparkSignals?.stocks?.[order.ticker])}
        </td>
        <td style="font-weight: ${isSelected ? '900' : '700'}; white-space: nowrap; color: #000;">
            ${order.ticker}
        </td>
        <td style="color: ${isLong ? '#1b5e20' : '#c62828'};">
            ${order.direction}
        </td>
        <td style="color: #444; text-align: right;">
            ${displayLimit}
        </td>
        <td style="color: #444; text-align: right;">
            ${parseFloat(order.entry_price).toFixed(2)}
        </td>
        <td style="color: #666; text-align: right;">
            ${parseFloat(order.initial_sl).toFixed(2)}
        </td>
        <td style="text-align: center;">
            ${order.quantity}
        </td>
        <td style="text-align: center; background-color: ${rowBgColor};">
            <button onclick="event.stopPropagation(); softDeleteOrder(${order.pending_id})"
                    onmouseenter="this.style.color='#d32f2f'; this.style.transform='scale(1.15)'"
                    onmouseleave="this.style.color='#ccc'; this.style.transform='scale(1)'"
                    style="background:none; border:none; cursor:pointer; color:#ccc; transition: transform 0.15s ease, color 0.15s ease;">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    `;

    return tr;
}