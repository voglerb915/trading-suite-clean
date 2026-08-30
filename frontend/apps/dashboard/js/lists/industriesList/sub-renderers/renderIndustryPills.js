export function renderIndustryHeader(sortedCount, state) {
    return `
        <div class="sectors-header">
            <div class="sectors-header-title">
                Industries 
                <span class="pill pill-count">${sortedCount}</span>

                <span class="pill pill-buy ${state.filterBuyIndustries ? 'active' : ''}" 
                    data-type="filterBuyIndustries">Buy</span>
                
                <span class="pill pill-sell ${state.filterSellIndustries ? 'active' : ''}" 
                    data-type="filterSellIndustries">Sell</span>
            </div>
            <div class="sectors-header-diffs">
                <div>∑ Stocks</div><div>D</div><div>W</div><div>M</div>
            </div>
        </div>
    `;
}