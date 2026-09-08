import { LargeTile } from "../templates/largeTile.js";
import { renderNameWithBar } from "@shared/logic/renderNameWithBar.js";
import { filterState } from "../../filters/filterState.js";

function momentumColor(mom) {
    if (mom > 0) return "#10b981";
    if (mom < 0) return "#ef4444";
    return "#aaa";
}

export function SectorOverviewTile(rawData) {
    let topContent = "<div>Lade Daten...</div>";
    let loserContent = "<div>Lade Daten...</div>";

    try {
        if (!rawData) {
            throw new Error("Keine Daten vorhanden");
        }

        const sorted = [...rawData].sort((a, b) => {
            const momA = a.history ? a.history[a.history.length - 1].y : (a.momentum || 0);
            const momB = b.history ? b.history[b.history.length - 1].y : (b.momentum || 0);
            return momB - momA;
        });

        const top2   = sorted.slice(0, 2);
        const loser2 = sorted.slice(-2);

        const { sector: activeSector } = filterState;

        const renderRows = (items) => items.map(item => {
            const name = item.sector || item.name;
            const mom  = item.history ? item.history[item.history.length - 1].y : (item.momentum || 0);
            const momColor = momentumColor(mom);

            const isSelected = activeSector && name === activeSector;
            const opacityStyle = (activeSector && !isSelected) ? "opacity: 0.3;" : "opacity: 1;";

            return `
                <div class="sector-row" data-sector="${name}"
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        font-size:0.8rem;
                        padding:3px 0;
                        border-bottom:1px solid rgba(255,255,255,0.05);
                        cursor:pointer;
                        ${opacityStyle}
                    ">
                    ${renderNameWithBar(name)}
                    <span style="color:${momColor}; font-weight:600;">
                        ${mom >= 0 ? "+" : ""}${mom.toFixed(1)}
                    </span>
                </div>
            `;
        }).join("");

        topContent   = renderRows(top2);
        loserContent = renderRows(loser2);

    } catch (err) {
        topContent   = `<div style="color:#ef4444; font-size:0.8rem;">Fehler beim Rendern</div>`;
        loserContent = `<div style="color:#ef4444; font-size:0.8rem;">Fehler beim Rendern</div>`;
    }

    const tile = LargeTile({
        title: "Sector Momentum (Top 2 / Loser 2)",
        sections: [
            { label: "Top 2 Momentum",     content: topContent },
            { label: "Weakest 2 Momentum", content: loserContent }
        ]
    });

    const titleEl = tile.querySelector(".tile-title");
    if (titleEl) {
        titleEl.style.cursor = "pointer";
        titleEl.title = "Klicken, um Filter zurückzusetzen";
        titleEl.addEventListener("click", () => {
            console.log("Filter zurückgesetzt über Titel-Klick");
            window.focusPanelResetFilter();
        });
    }

    tile.querySelectorAll(".sector-row").forEach(row => {
        const sectorName = row.dataset.sector;
        row.addEventListener("click", () => {
            console.log("Sektor geklickt:", sectorName);
            window.focusPanelSelectSector(sectorName);
        });
    });

    return tile;
}