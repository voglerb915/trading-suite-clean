// frontend/apps/dashboard/js/structure/renderDashboardSectors.js

import { renderSectorsList } from "../lists/sectorsList/renderSectorsList.js";

export function renderDashboardSectors(sectors, state) {
    const container = document.querySelector("#sector-list-container");
    if (!container) return;

    renderSectorsList(sectors, state);
}
