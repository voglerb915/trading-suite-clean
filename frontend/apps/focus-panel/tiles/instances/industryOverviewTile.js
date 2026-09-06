import { LargeTile } from "../templates/largeTile.js";
import { renderColorBar } from "@shared/logic/renderNameWithBar.js";   // ⭐ FIX


function momentumColor(mom) {
    if (mom > 0) return "#10b981";
    if (mom < 0) return "#ef4444";
    return "#aaa";
}

export async function IndustryOverviewTile() {
    let topContent = "<div>Lade Daten...</div>";
    let loserContent = "<div>Lade Daten...</div>";

    try {
        const response = await fetch('http://localhost:4000/api/market/industries/momentum?days=5');
        if (!response.ok) throw new Error("Netzwerkfehler");

        const data = await response.json();

        // Momentum aus history oder momentum-Feld
        const sorted = [...data].sort((a, b) => {
            const momA = a.history ? a.history[a.history.length - 1].y : (a.momentum || 0);
            const momB = b.history ? b.history[b.history.length - 1].y : (b.momentum || 0);
            return momB - momA;
        });

        const top10   = sorted.slice(0, 10);
        const loser10 = sorted.slice(-10);

        const renderRows = (items) => items.map(item => {
            const name = item.industry || item.name;
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
        <span style="
            display:flex;
            align-items:center;
            gap:6px;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            max-width:200px;
        ">
            ${renderColorBar(item.sector)}   <!-- ⭐ FIX -->
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
        topContent   = `<div style="color:#ef4444; font-size:0.8rem;">Fehler beim Laden</div>`;
        loserContent = `<div style="color:#ef4444; font-size:0.8rem;">Fehler beim Laden</div>`;
    }

    return LargeTile({
        title: "Industry Momentum (Top 10 / Loser 10)",
        sections: [
            { label: "Top 10 Momentum",     content: topContent },
            { label: "Weakest 10 Momentum", content: loserContent }
        ]
    });
}
