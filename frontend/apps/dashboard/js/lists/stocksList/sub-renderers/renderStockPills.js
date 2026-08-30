export function renderStockPills(count, state) {
    const pillContainer = document.getElementById("stocks-pill-container");
    if (pillContainer) {
        pillContainer.innerHTML = `
            <span class="pill pill-count">${count}</span>
            <span class="pill pill-buy ${state.filterBuyStocks ? 'active' : ''}" data-type="filterBuyStocks">Buy</span>
            <span class="pill pill-sell ${state.filterSellStocks ? 'active' : ''}" data-type="filterSellStocks">Sell</span>
        `;
    }
}