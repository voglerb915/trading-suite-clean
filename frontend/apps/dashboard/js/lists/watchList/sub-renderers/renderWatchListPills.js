export function renderWatchlistPills(count, state) {
    // Auf den im HTML existierenden Container mappen:
    const pillContainer = document.getElementById("tools-pill-container");
    if (pillContainer) {
        pillContainer.innerHTML = `
            <span class="pill pill-count">${count}</span>
            <span class="pill pill-filter ${state.filterWatchlistDrafts ? 'active' : ''}" data-type="filterWatchlistDrafts">Drafts</span>
        `;
    }
}