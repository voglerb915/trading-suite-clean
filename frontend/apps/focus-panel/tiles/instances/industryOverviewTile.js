// tiles/instances/industryOverviewTile.js

import { LargeTile } from "../templates/largeTile.js";
import { renderColorBar } from "@shared/logic/renderNameWithBar.js";
import { filterState } from "../../filters/filterState.js";

function momentumColor(mom) {
    if (mom > 0) return "#10b981";
    if (mom < 0) return "#ef4444";
    return "#aaa";
}

export function IndustryOverviewTile(rawData) {
    let topContent = "<div>Lade Daten...</div>";
    let loserContent = "<div>Lade Daten...</div>";

    try {
        if (!rawData) {
            throw new Error("Keine Daten vorhanden");
        }

        // 1. Immer das globale Ranking über alle Industries bilden
        const sorted = [...rawData].sort((a, b) => {
            const momA = a.history ? a.history[a.history.length - 1].y : (a.momentum || 0);
            const momB = b.history ? b.history[b.history.length - 1].y : (b.momentum || 0);
            return momB - momA;
        });

        const top10   = sorted.slice(0, 10);
        const loser10 = sorted.slice(-10);

        // 2. Aktiven Sektor und aktive Industry aus dem State auslesen
        const { sector: activeSector, industry: activeIndustry } = filterState;

        const renderRows = (items) => items.map(item => {
            const name = item.industry || item.name;
            const mom  = item.history ? item.history[item.history.length - 1].y : (item.momentum || 0);
            const momColor = momentumColor(mom);

            // 3. Erweiterte Dimming-Logik: 
            // - Wenn eine Industry aktiv ist: Nur die exakte Industry leuchten lassen.
            // - Wenn ein Sektor aktiv ist (und keine Industry): Alle aus diesem Sektor leuchten lassen.
            let isSelected = false;
            if (activeIndustry) {
                isSelected = (name === activeIndustry);
            } else if (activeSector) {
                isSelected = (item.sector === activeSector);
            }

            const opacityStyle = ((activeSector || activeIndustry) && !isSelected) ? "opacity: 0.3;" : "opacity: 1;";

            return `
                <div class="industry-row" data-industry="${name}"
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
                    <span style="
                        display:flex;
                        align-items:center;
                        gap:6px;
                        white-space:nowrap;
                        overflow:hidden;
                        text-overflow:ellipsis;
                        max-width:200px;
                    ">
                        ${renderColorBar(item.sector)}
                        <span>${name}</span>
                    </span>

                    <span style="color:${momColor}; font-weight:600;">
                        ${mom >= 0 ? "+" : ""}${mom.toFixed(1)}
                    </span>
                </div>
            `;
        }).join("");

        topContent   = renderRows(top10);
        loserContent = renderRows(loser10);

    } catch (err) {
        topContent   = `<div style="color:#ef4444; font-size:0.8rem;">Fehler beim Rendern</div>`;
        loserContent = `<div style="color:#ef4444; font-size:0.8rem;">Fehler beim Rendern</div>`;
    }

    const tile = LargeTile({
        title: "Industry Momentum (Top 10 / Loser 10)",
        sections: [
            { label: "Top 10 Momentum",     content: topContent },
            { label: "Weakest 10 Momentum", content: loserContent }
        ]
    });

    // Klick auf den Titel zum Zurücksetzen
    const titleEl = tile.querySelector(".tile-title");
    if (titleEl) {
        titleEl.style.cursor = "pointer";
        titleEl.title = "Klicken, um Filter zurückzusetzen";
        titleEl.addEventListener("click", () => {
            console.log("Filter zurückgesetzt über Branchen-Titel-Klick");
            if (typeof window.focusPanelResetFilter === "function") {
                window.focusPanelResetFilter();
            }
        });
    }

    // Klick auf einzelne Branchen-Zeilen
    tile.querySelectorAll(".industry-row").forEach(row => {
        const industryName = row.dataset.industry;
        row.addEventListener("click", () => {
            console.log("Industrie geklickt:", industryName);
            if (typeof window.focusPanelSelectIndustry === "function") {
                window.focusPanelSelectIndustry(industryName);
            }
        });
    });

    return tile;
}