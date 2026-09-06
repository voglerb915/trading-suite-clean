import { LargeTile } from "../templates/largeTile.js";
import { renderColorBar } from "@shared/logic/renderNameWithBar.js"; // nur Balken

// ⭐ Sortierung komplett absteigend (DESC)
const sortByMomentumDesc = (a, b) => {
    const momA = a.history ? a.history[a.history.length - 1].y : (a.momentum || 0);
    const momB = b.history ? b.history[b.history.length - 1].y : (b.momentum || 0);
    return momB - momA; // DESC
};

export async function StockOverviewTile(universeKey, titleName) {
    let topContent = "<div>Lade Daten...</div>";
    let loserContent = "<div>Lade Daten...</div>";

    try {
        const response = await fetch(
            `http://localhost:4000/api/market/stocks/momentum?days=5&universe=${universeKey}`
        );
        if (!response.ok) throw new Error("Netzwerkfehler");
        
        const data = await response.json(); // { top: [...], losers: [...] }

        // ⭐ Sortierung einbauen
        const sortedTop = [...data.top].sort(sortByMomentumDesc);
        const sortedLosers = [...data.losers].sort(sortByMomentumDesc);

        const renderRows = (items) => {
            if (!items || items.length === 0) {
                return `<div style="font-size: 0.75rem; color: #888; padding: 4px 0;">Keine Werte</div>`;
            }

            return items.map(item => {
                const ticker = item.ticker;
                const company = item.company || ticker;
                const price = item.price ? `$${item.price.toFixed(2)}` : "-";
                const sector = item.sector;   // ⭐ Farbe kommt vom Sektor
                const mom = item.momentum || 0;
                const momColor = mom >= 0 ? "#10b981" : "#ef4444";

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
                            overflow:hidden;
                            text-overflow:ellipsis;
                            max-width:200px;
                        ">
                            ${renderColorBar(sector)}   <!-- ⭐ Nur Balken -->
                            <span style="display:flex; flex-direction:column;">
                                <strong>${ticker}</strong>
                                <span style="font-size:0.7rem; color:#aaa; white-space:nowrap;">
                                    ${company} — ${price}
                                </span>
                            </span>
                        </span>

                        <span style="color:${momColor}; font-weight:600;">
                            ${mom >= 0 ? "+" : ""}${mom.toFixed(1)}
                        </span>
                    </div>
                `;
            }).join("");
        };

        topContent = renderRows(sortedTop);
        loserContent = renderRows(sortedLosers);

    } catch (err) {
        topContent = `<div style="color: #f44336; font-size: 0.8rem;">Fehler beim Laden</div>`;
        loserContent = `<div style="color: #f44336; font-size: 0.8rem;">Fehler beim Laden</div>`;
    }

    return LargeTile({
        title: `${titleName} (Top / Loser)`,
        sections: [
            { label: "Top Momentum", content: topContent },
            { label: "Weakest Momentum", content: loserContent }
        ]
    });
}
