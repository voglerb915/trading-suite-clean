import GlobalState from "../../../../shared/state/globalState.js";
import { stylePill } from "../renderer/rrgPillsRenderer.js";


const QUADRANTS = [
    { key: "leading", name: "Leading" },
    { key: "improving", name: "Improving" },
    { key: "weakening", name: "Weakening" },
    { key: "lagging", name: "Lagging" }
];

export function renderQuadrantFilterBar(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let activeQuadrants = GlobalState.get("activeQuadrants");
    if (!activeQuadrants) {
        activeQuadrants = new Set(QUADRANTS.map(q => q.key));
        GlobalState.set("activeQuadrants", activeQuadrants);
    }

    container.innerHTML = "";
    container.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px;";

    const allKeys = QUADRANTS.map(q => q.key);
    const isAllActive = activeQuadrants.size === allKeys.length;

    const allBtn = document.createElement("button");
    allBtn.className = `filter-pill ${isAllActive ? "active" : ""}`;
    allBtn.innerText = "ALL Q";
    stylePill(allBtn, isAllActive);

    allBtn.addEventListener("click", () => {
        GlobalState.set("activeQuadrants", new Set(allKeys));
        renderQuadrantFilterBar(containerId, onFilterChange);
        if (onFilterChange) onFilterChange();
    });
    container.appendChild(allBtn);

    QUADRANTS.forEach(q => {
        const btn = document.createElement("button");
        const isSingleSelected = activeQuadrants.size === 1 && activeQuadrants.has(q.key);

        btn.className = `filter-pill ${isSingleSelected ? "active" : ""}`;
        btn.innerText = q.name;
        stylePill(btn, isSingleSelected);

        btn.addEventListener("click", () => {
            if (activeQuadrants.size === 1 && activeQuadrants.has(q.key)) {
                GlobalState.set("activeQuadrants", new Set(allKeys));
            } else {
                GlobalState.set("activeQuadrants", new Set([q.key]));
            }

            renderQuadrantFilterBar(containerId, onFilterChange);
            if (onFilterChange) onFilterChange();
        });

        container.appendChild(btn);
    });
}



