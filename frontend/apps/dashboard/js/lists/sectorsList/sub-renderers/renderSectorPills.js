export function renderSectorHeader(sortedCount, state) {
    return `
        <div class="sectors-header">
            <div class="sectors-header-title">
                Sectors 
                <span class="pill pill-count">${sortedCount}</span>

                <span class="pill pill-buy ${state.filterBuySectors ? 'active' : ''}" 
                      data-type="filterBuySectors">Buy</span>

                <span class="pill pill-sell ${state.filterSellSectors ? 'active' : ''}" 
                      data-type="filterSellSectors">Sell</span>
            </div>

            <div class="sectors-header-diffs">
                <div>∑ Stocks</div>
                <div>W</div>
                <div>M</div>
                <div>Q</div>
            </div>
        </div>
    `;
}