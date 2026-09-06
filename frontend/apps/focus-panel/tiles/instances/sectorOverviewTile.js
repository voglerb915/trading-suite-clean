// focus-panel/tiles/instances/sectorOverviewTile.js  (Pfad exemplarisch)

import { LargeTile } from "../templates/largeTile.js";
import { renderNameWithBar } from "@shared/logic/renderNameWithBar.js";

function momentumColor(mom) {
    if (mom > 0) return "#10b981";
    if (mom < 0) return "#ef4444";
    return "#aaa";
}

export async function SectorOverviewTile() {
    let topContent = "<div>Lade Daten...</div>";
    let loserContent = "<div>Lade Daten...</div>";

    try {
        const response = await fetch("http://localhost:4000/api/market/sectors/momentum?days=5");
        if (!response.ok) throw new Error("Netzwerkfehler");

        const data = await response.json();

        const sorted = [...data].sort((a, b) => {
            const momA = a.history ? a.history[a.history.length - 1].y : (a.momentum || 0);
            const momB = b.history ? b.history[b.history.length - 1].y : (b.momentum || 0);
            return momB - momA;
        });

        const top2   = sorted.slice(0, 2);
        const loser2 = sorted.slice(-2);

        const renderRows = (items) => items.map(item => {
            const name = item.sector || item.name;
            const mom  = item.history ? item.history[item.history.length - 1].y : (item.momentum || 0);
            const momColor = momentumColor(mom);

            return `
                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    font-size:0.8rem;
                    padding:3px 0;
                    border-bottom:1px solid rgba(255,255,255,0.05);
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
        topContent   = `<div style="color:#ef4444; font-size:0.8rem;">Fehler beim Laden</div>`;
        loserContent = `<div style="color:#ef4444; font-size:0.8rem;">Fehler beim Laden</div>`;
    }

    return LargeTile({
        title: "Sector Momentum (Top 2 / Loser 2)",
        sections: [
            { label: "Top 2 Momentum",     content: topContent },
            { label: "Weakest 2 Momentum", content: loserContent }
        ]
    });
}
