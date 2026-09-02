// apps/charting-tool/js/filters/indexFilterRenderer.js

import GlobalState from "../../../../shared/state/globalState.js";

const INDEXES = [
    { key: "SP500", label: "S&P 500" },
    { key: "NDX", label: "Nasdaq 100" },
    { key: "DJI", label: "Dow Jones" },
    { key: "RUT", label: "Russell 2000" },
    { key: "NONE", label: "Other" }
];

export function renderIndexFilterBar(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let activeIndex = GlobalState.get("activeIndex");
    if (!activeIndex) {
        activeIndex = "SP500";
        GlobalState.set("activeIndex", activeIndex);
    }

    container.innerHTML = "";
    container.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px;";

    INDEXES.forEach(index => {
        const btn = document.createElement("button");
        const isActive = activeIndex === index.key;

        btn.className = `filter-pill ${isActive ? "active" : ""}`;
        btn.innerText = index.label;
        stylePill(btn, isActive);

        btn.addEventListener("click", () => {
            GlobalState.set("activeIndex", index.key);
            renderIndexFilterBar(containerId, onFilterChange);
            if (onFilterChange) onFilterChange(index.key);
        });

        container.appendChild(btn);
    });
}

function stylePill(btn, active) {
    btn.style.cssText = `
        background: ${active ? "#f59e0b" : "#2d2d2d"};
        color: #ffffff;
        border: 1px solid ${active ? "#d97706" : "#444"};
        padding: 6px 12px;
        border-radius: 16px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        transition: all 0.2s ease;
    `;
}
