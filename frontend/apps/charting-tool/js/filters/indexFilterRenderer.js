// apps/charting-tool/js/filters/indexFilterRenderer.js

import GlobalState from "../../../../shared/state/globalState.js";
import { stylePill } from "../renderer/rrgPillsRenderer.js";


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



