export function renderOrdersPills(count, state) {
    const pillContainer = document.getElementById("tools-pill-container");
    if (pillContainer) {
        pillContainer.innerHTML = `
            <span class="pill pill-count">${count}</span>
            <span class="pill pill-filter ${state.filterOrdersDrafts ? 'active' : ''}" data-type="filterOrdersDrafts">Drafts</span>
        `;
    }
}