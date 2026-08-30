// apps/dashboard/js/structure/renderDashboardIndustries.js

import { renderIndustriesList } from "../lists/industriesList/renderIndustriesList.js";

export function renderDashboardIndustries(industries, state) {
    const container = document.querySelector("#industry-list-container");
    if (!container) return;

    renderIndustriesList(industries, state);
}