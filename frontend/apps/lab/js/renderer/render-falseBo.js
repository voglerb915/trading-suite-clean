export function renderStrategyList(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container mit ID #${containerId} nicht gefunden.`);
        return;
    }

    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `<div class="p-4 text-gray-400">Keine False Breakout Setups gefunden.</div>`;
        return;
    }

    // Grundgerüst mit Filter-Dropdown im Header einmalig aufbauen
    container.innerHTML = `
        <div class="p-3 mb-2 bg-gray-900 text-white rounded flex justify-between items-center text-sm font-semibold sticky top-0 z-10">
            <div class="flex items-center gap-3">
                <span>False Breakout Setups</span>
                <select id="bo-time-filter" class="bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500">
                    <option value="6weeks" selected>Letzte 6 Wochen</option>
                    <option value="all">Alle anzeigen</option>
                </select>
            </div>
            <span id="bo-count-badge" class="bg-blue-600 px-2 py-0.5 rounded text-xs">0 Titel</span>
        </div>
        <div id="bo-table-wrapper" class="overflow-y-auto max-h-[calc(100vh-180px)] border border-gray-700 rounded bg-gray-900 text-xs">
            <!-- Tabelle wird dynamisch gefüllt -->
        </div>
    `;

    const filterSelect = document.getElementById('bo-time-filter');
    const tableWrapper = document.getElementById('bo-table-wrapper');
    const countBadge = document.getElementById('bo-count-badge');

    // Filter-Funktion
    function updateView() {
        const filterValue = filterSelect.value;
        const now = new Date(); // Aktuelles Datum (Referenz: heute)
        
        const filteredData = data.filter(item => {
            if (!item.gap_down_date) return false;
            if (filterValue === 'all') return true;

            const gapDate = new Date(item.gap_down_date);
            const diffTime = now - gapDate;
            const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);

            return diffWeeks <= 6;
        });

        countBadge.textContent = `${filteredData.length} Titel`;

        if (filteredData.length === 0) {
            tableWrapper.innerHTML = `<div class="p-4 text-gray-400 text-center">Keine Setups im gewählten Zeitraum.</div>`;
            return;
        }

        let html = `
            <table class="false-bo-table w-full text-left border-collapse">
                <thead class="bg-gray-800 text-gray-400 sticky top-[44px] z-10 border-b border-gray-700">
                    <tr>
                        <th class="p-2 col-gap-date">Gap Down</th>
                        <th class="p-2 col-index">Index</th>
                        <th class="p-2 col-sector">Sektor</th>
                        <th class="p-2 col-ticker">Ticker</th>
                        <th class="p-2 col-name">Name</th>
                        <th class="p-2 col-price">Preis</th>
                        <th class="p-2 col-change">Change</th>                        
                        <th class="p-2 col-gap-close">Gap Close</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-800 text-gray-300">
        `;

        filteredData.forEach(item => {
            const changeColor = item.change >= 0 ? 'text-green-400' : 'text-red-400';
            const formattedChange = item.change >= 0 ? `+${item.change}%` : `${item.change}%`;
            const gapDateStr = item.gap_down_date ? item.gap_down_date.split('T')[0] : '-';
            
            const indexPills = Array.isArray(item.index) && item.index.length > 0
                ? item.index.map(idx => `<span class="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-[9px] mr-0.5">${idx}</span>`).join('')
                : '-';

            html += `
                <tr class="hover:bg-gray-800/60 transition-colors">
                    <td class="p-2 col-gap-date text-red-400">${gapDateStr}</td>
                    <td class="p-2 col-index">${indexPills}</td>
                    <td class="p-2 col-sector text-gray-400" title="${item.sector || ''}">${item.sector || '-'}</td>
                    <td class="p-2 col-ticker"><span class="font-bold text-white bg-gray-800 px-1.5 py-0.5 rounded">${item.ticker}</span></td>
                    <td class="p-2 col-name text-gray-400" title="${item.name || ''}">${item.name || ''}</td>
                    <td class="p-2 col-price font-medium text-white">${item.price ? item.price.toFixed(2) : '-'}</td>
                    <td class="p-2 col-change font-semibold ${changeColor}">${formattedChange}</td>                    
                    <td class="p-2 col-gap-close text-gray-300">${item.gap_down_close ?? '-'}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        tableWrapper.innerHTML = html;
    }

    // Event Listener für Filterwechsel
    filterSelect.addEventListener('change', updateView);

    // Initialer Aufruf
    updateView();
}