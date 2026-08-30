// apps/lab/render/renderSectorFilter.js
import GlobalState from "../../../shared/state/globalState.js";

const XL_SECTORS = [
    { ticker: "XLK", name: "Technology" },
    { ticker: "XLF", name: "Financials" },
    { ticker: "XLE", name: "Energy" },
    { ticker: "XLU", name: "Utilities" },
    { ticker: "XLI", name: "Industrials" },
    { ticker: "XLY", name: "Cons. Disc." },
    { ticker: "XLP", name: "Cons. Staples" },
    { ticker: "XLV", name: "Health Care" },
    { ticker: "XLB", name: "Materials" },
    { ticker: "XLRE", name: "Real Estate" },
    { ticker: "XLC", name: "Comm. Services" }
];

export function renderSectorFilterBar(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // State initialisieren: Standardmäßig alle Sektoren aktiv
    let activeSectors = GlobalState.get("activeSectors");
    if (!activeSectors) {
        activeSectors = new Set(XL_SECTORS.map(s => s.ticker));
        GlobalState.set("activeSectors", activeSectors);
    }

    container.innerHTML = "";
    container.style.cssText = "display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;";

    const allTickers = XL_SECTORS.map(s => s.ticker);
    const isAllActive = activeSectors.size === allTickers.length;

    // "ALL" Button
    const allBtn = document.createElement("button");
    allBtn.className = `filter-pill ${isAllActive ? "active" : ""}`;
    allBtn.innerText = "ALL";
    stylePill(allBtn, isAllActive);

    allBtn.addEventListener("click", () => {
        const newSet = new Set(allTickers);
        GlobalState.set("activeSectors", newSet);
        renderSectorFilterBar(containerId, onFilterChange);
        if (onFilterChange) onFilterChange();
    });
    container.appendChild(allBtn);

    // Einzelne Ticker-Pillen
    XL_SECTORS.forEach(sector => {
        const btn = document.createElement("button");
        const isSingleSelected = activeSectors.size === 1 && activeSectors.has(sector.ticker);
        
        btn.className = `filter-pill ${isSingleSelected ? "active" : ""}`;
        btn.innerText = sector.ticker;
        btn.title = sector.name;
        stylePill(btn, isSingleSelected);

        btn.addEventListener("click", () => {
            if (activeSectors.size === 1 && activeSectors.has(sector.ticker)) {
                GlobalState.set("activeSectors", new Set(allTickers));
            } else {
                GlobalState.set("activeSectors", new Set([sector.ticker]));
            }

            renderSectorFilterBar(containerId, onFilterChange);
            if (onFilterChange) onFilterChange();
        });

        container.appendChild(btn);
    });
}

function stylePill(btn, active) {
    btn.style.cssText = `
        background: ${active ? '#f59e0b' : '#2d2d2d'};
        color: #ffffff;
        border: 1px solid ${active ? '#d97706' : '#444'};
        padding: 6px 12px;
        border-radius: 16px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        transition: all 0.2s ease;
    `;
}