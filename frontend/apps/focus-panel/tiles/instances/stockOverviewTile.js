// apps/focus-panel/tiles/instances/stockOverviewTile.js
import { LargeTile } from "../templates/largeTile.js";

export async function StockOverviewTile(universeKey, titleName) {
    let topContent = "<div>Lade Daten...</div>";
    let loserContent = "<div>Lade Daten...</div>";

    try {
        // Wir holen direkt den gefilterten Endpoint für den jeweiligen Index ab
        const response = await fetch(`http://localhost:4000/api/market/stocks/momentum?days=5&universe=${universeKey}`);
        if (!response.ok) throw new Error("Netzwerkfehler");
        
        const data = await response.json(); // Liefert { top: [...], losers: [...] } für diesen Index

        const renderRows = (items) => {
            if (!items || items.length === 0) {
                return `<div style="font-size: 0.75rem; color: #888; padding: 4px 0;">Keine Werte</div>`;
            }

            return items.map(item => {
                const name = item.ticker;
                const mom = item.momentum || 0;
                const color = mom >= 0 ? '#4caf50' : '#f44336';
                
                return `
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${item.company || name}">
                            <strong>${name}</strong> <span style="font-size: 0.7rem; color: #aaa;">(${item.price ? '$' + item.price.toFixed(2) : '-'})</span>
                        </span>
                        <span style="color:${color}; font-weight: 500;">
                            ${mom >= 0 ? "+" : ""}${mom.toFixed(1)}
                        </span>
                    </div>
                `;
            }).join("");
        };

        topContent = renderRows(data.top);
        loserContent = renderRows(data.losers);

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