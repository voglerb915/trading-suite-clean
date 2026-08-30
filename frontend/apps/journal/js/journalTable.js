export class JournalTable {
    constructor(containerElement, onRowClickCallback) {
        this.container = containerElement;
        this.onRowClick = onRowClickCallback;
    }

    render(data) {
        if (!data || data.length === 0) {
            this.container.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #888; padding: 20px;">Keine Einträge gefunden.</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            // Hier wird das rohe Date-Objekt / ISO-String fehlerfrei in ein deutsches Format zerlegt
            let execTime = '-';
            if (item.entry_date) {
                const d = new Date(item.entry_date);
                if (!isNaN(d.getTime())) {
                    const day = String(d.getUTCDate()).padStart(2, '0');
                    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const year = d.getUTCFullYear();
                    const hours = String(d.getUTCHours()).padStart(2, '0');
                    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
                    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
                    
                    execTime = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
                }
            }

            const price = item.entry_price > 0 ? Number(item.entry_price).toFixed(2) : (item.exit_price > 0 ? Number(item.exit_price).toFixed(2) : '-');

html += `
    <tr data-pending-id="${item.pending_id}" style="border-bottom: 1px solid #333; cursor: pointer;">
        <td style="padding: 8px 10px; color: #ffffff;">${item.execution_id ?? '-'}</td>
        <td style="padding: 8px 10px; color: #888;">${item.pending_id ?? '-'}</td>
        <td style="padding: 8px 10px; font-weight: bold; color: #2ecc71;">${item.ticker ?? '-'}</td>
        <td style="padding: 8px 10px;">${item.strategy ?? '-'}</td>
        <td style="padding: 8px 10px;">${item.order_role ?? '-'}</td>
        <td style="padding: 8px 10px;">${price}</td>
        <td style="padding: 8px 10px;">${item.quantity ?? '-'}</td>
        <td style="padding: 8px 10px;">${execTime}</td>
        <td style="padding: 8px 10px;">${item.order_status ?? '-'}</td>
    </tr>
`;
        });

        this.container.innerHTML = html;

        // Event-Delegation für Zeilenklicks
        this.container.querySelectorAll('tr').forEach((row, index) => {
            row.addEventListener('click', () => {
                if (this.onRowClick) {
                    this.onRowClick(data[index]);
                }
            });
        });
    }
}