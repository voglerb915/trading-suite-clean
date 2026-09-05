// apps/charting-tool/js/rs/renderer/sectorPillsRenderer.js

import GlobalState from "@shared/state/globalState.js";

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

// stylePill reduziert auf die reine Klassen-Steuerung
function stylePill(btn, active) {
    if (active) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

/**
 * Lab-Logik, sauber über CSS-Klassen gesteuert ohne Inline-Stile
 */
export function renderSectorPills(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let activeSectors = GlobalState.get("activeSectors");

    // Wenn noch kein State existiert → ALLE aktiv (Lab-Standard)
    if (!activeSectors) {
        activeSectors = new Set(XL_SECTORS.map(s => s.ticker));
        GlobalState.set("activeSectors", activeSectors);
    }

    container.innerHTML = "";
    // Keine Inline-Styles mehr für den Container, Layout läuft komplett über CSS (.rs-filter-row / CSS-Klassen)

    const allTickers = XL_SECTORS.map(s => s.ticker);
    const isAllActive = activeSectors.size === allTickers.length;

    // --- ALL Button ---
    const allBtn = document.createElement("button");
    allBtn.className = "metric-pill";
    allBtn.innerText = "ALL";
    stylePill(allBtn, isAllActive);

    allBtn.addEventListener("click", () => {
        GlobalState.set("activeSectors", new Set(allTickers));
        renderSectorPills(containerId, onFilterChange);
        if (onFilterChange) onFilterChange();
    });

    container.appendChild(allBtn);

    // --- Einzelne Sector-Pillen ---
    XL_SECTORS.forEach(sector => {
        const btn = document.createElement("button");
        btn.className = "metric-pill";
        const isSingleSelected = activeSectors.size === 1 && activeSectors.has(sector.ticker);

        btn.innerText = sector.ticker;
        btn.title = sector.name;
        stylePill(btn, isSingleSelected);

        btn.addEventListener("click", () => {
            if (activeSectors.size === 1 && activeSectors.has(sector.ticker)) {
                // Wenn der einzige aktive erneut geklickt wird → wieder ALL
                GlobalState.set("activeSectors", new Set(allTickers));
            } else {
                // Sonst → nur dieser Sektor aktiv
                GlobalState.set("activeSectors", new Set([sector.ticker]));
            }

            renderSectorPills(containerId, onFilterChange);
            if (onFilterChange) onFilterChange();
        });

        container.appendChild(btn);
    });
}