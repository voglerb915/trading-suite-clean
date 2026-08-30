import { renderRankCircle } from "../../../helpers/renderHelpers.js";

export function renderActiveOrdersItem(order, isSelected) {
    const rowBgColor = isSelected ? '#fff3e0' : 'white';
    const displayStatus = order.status ?? "none";
    
    let formattedDate = "—";
    if (order.execution_time) {
        const dateObj = new Date(order.execution_time);
        if (!isNaN(dateObj)) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            formattedDate = `${day}.${month}.${year}, ${hours}:${minutes}`;
        }
    }

    const tr = document.createElement("tr");
    tr.className = `order-row ${isSelected ? 'highlight-order' : ''}`;
    tr.style.cssText = `border-bottom: 1px solid #eee; background-color: ${rowBgColor}; cursor: pointer;`;
    
    tr.onclick = function() {
        window.selectedActiveOrderTicker = order.ticker;
        document.querySelectorAll('#tools-tab-content .order-row').forEach(r => {
            r.style.backgroundColor = 'white';
            const actionTd = r.querySelector('td:last-child');
            if (actionTd) actionTd.style.backgroundColor = 'white';
        });
        this.style.backgroundColor = '#fff3e0';
        const currentActionTd = this.querySelector('td:last-child');
        if (currentActionTd) currentActionTd.style.backgroundColor = '#fff3e0';
    };

    tr.innerHTML = `
        <td>
            ${renderRankCircle(order.pending_id, window.dataStore?.sparkSignals?.stocks?.[order.ticker])}
        </td>
        <td>
            <strong style="font-size:0.85rem; color:#000;">${order.ticker ?? '—'}</strong>
        </td>
        <td style="font-size: 0.85rem; color: #444; font-weight: 600; text-align: center;" title="IB Order ID">
            ${order.ib_order_id ?? '—'}
        </td>
        <td>
            ${(() => {
                const s = (displayStatus || '').toLowerCase();
                let bg = '#f5f5f5', color = '#333333', border = '#cccccc';
                if (s.includes('submit')) { bg = '#fff3e0'; color = '#e65100'; border = '#ffb74d'; }
                else if (s.includes('exec') || s.includes('fill')) { bg = '#e8f5e9'; color = '#2e7d32'; border = '#81c784'; }
                else if (s.includes('cancel')) { bg = '#ffebee'; color = '#c62828'; border = '#e57373'; }
                return `<span style="display: inline-block; padding: 2px 8px; font-size: 0.75rem; font-weight: 600; border-radius: 12px; background-color: ${bg}; color: ${color}; border: 1px solid ${border}; text-transform: uppercase;">${displayStatus}</span>`;
            })()}
        </td>
        <td style="font-size:0.85rem; color:#444;">
            ${formattedDate}
        </td>
        <td class="col-del" style="text-align: center;">
            <button onclick="event.stopPropagation(); deleteActiveOrder(${order.pending_id})"
                    onmouseenter="this.style.color='#d32f2f'; this.style.transform='scale(1.20)'"
                    onmouseleave="this.style.color='#ccc'; this.style.transform='scale(1)'"
                    style="background:none; border:none; cursor:pointer; color:#ccc; transition: transform 0.15s ease, color 0.15s ease;"
                    title="Eintrag löschen">
                <i class="fas fa-trash-alt" style="font-size: 1.05rem;"></i>
            </button>
        </td>
    `;

    return tr; // <--- DAS HAT GEFEHLT
}