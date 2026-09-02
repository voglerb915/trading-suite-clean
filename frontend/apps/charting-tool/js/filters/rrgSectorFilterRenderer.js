import GlobalState from "@shared/state/globalState.js";
import { sectorTickers } from "@shared/logic/sectorMapping.js";

const XL_SECTORS = Object.entries(sectorTickers).map(([name, ticker]) => ({
    ticker,
    name
}));

export function renderSectorFilterBar(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let activeSectors = GlobalState.get("activeSectors");
    if (!activeSectors) {
        activeSectors = new Set(XL_SECTORS.map(s => s.ticker));
        GlobalState.set("activeSectors", activeSectors);
    }

    container.innerHTML = "";
    container.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px;";

    const allTickers = XL_SECTORS.map(s => s.ticker);
    const isAllActive = activeSectors.size === allTickers.length;

    const allBtn = document.createElement("button");
    allBtn.className = `filter-pill ${isAllActive ? "active" : ""}`;
    allBtn.innerText = "ALL";
    stylePill(allBtn, isAllActive);

    allBtn.addEventListener("click", () => {
        GlobalState.set("activeSectors", new Set(allTickers));
        renderSectorFilterBar(containerId, onFilterChange);
        if (onFilterChange) onFilterChange(null);
    });
    container.appendChild(allBtn);

    XL_SECTORS.forEach(sector => {
        const btn = document.createElement("button");
        const isSingleSelected = activeSectors.size === 1 && activeSectors.has(sector.ticker);

        btn.className = `filter-pill ${isSingleSelected ? "active" : ""}`;
        btn.innerText = sector.ticker;
        btn.title = sector.name;
        stylePill(btn, isSingleSelected);

        btn.addEventListener("click", () => {
            let selectedName = null;

            if (activeSectors.size === 1 && activeSectors.has(sector.ticker)) {
                GlobalState.set("activeSectors", new Set(allTickers));
            } else {
                GlobalState.set("activeSectors", new Set([sector.ticker]));
                selectedName = sector.name;
            }

            renderSectorFilterBar(containerId, onFilterChange);
            if (onFilterChange) onFilterChange(selectedName);
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
