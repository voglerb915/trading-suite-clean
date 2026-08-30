// apps/focus-panel/tiles/instances/sectorOverviewTile.js
import { LargeTile } from "../templates/largeTile.js";

export async function SectorOverviewTile() {
    let topContent = "<div>Lade Daten...</div>";
    let loserContent = "<div>Lade Daten...</div>";

    try {
        const response = await fetch('http://localhost:4000/api/market/sectors/momentum?days=5');
        if (!response.ok) throw new Error("Netzwerkfehler");
        
        const data = await response.json();

        // Sortieren
        const sorted = [...data].sort((a, b) => {
            const momA = a.history ? a.history[a.history.length - 1].y : (a.momentum || 0);
            const momB = b.history ? b.history[b.history.length - 1].y : (b.momentum || 0);
            return momB - momA;
        });

        const top2 = sorted.slice(0, 2);
        const loser2 = sorted.slice(-2);

        // Hilfsfunktion für die Zeilen
        const renderRows = (items) => items.map(item => {
            const name = item.sector || item.name;
            const mom = item.history ? item.history[item.history.length - 1].y : (item.momentum || 0);
            const color = mom >= 0 ? '#4caf50' : '#f44336';
            
            return `
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${name}">${name}</span>
                    <span style="color:${color}; font-weight: 500;">
                        ${mom >= 0 ? "+" : ""}${mom.toFixed(1)}
                    </span>
                </div>
            `;
        }).join("");

        // Daten zuweisen
        topContent = renderRows(top2);
        loserContent = renderRows(loser2);

    } catch (err) {
        topContent = `<div style="color: #f44336; font-size: 0.8rem;">Fehler beim Laden</div>`;
        loserContent = `<div style="color: #f44336; font-size: 0.8rem;">Fehler beim Laden</div>`;
    }

    // Hier liegt die Magie: Die LargeTile benötigt 'sections'
    return LargeTile({
        title: "Sector Momentum (Top 2 / Loser 2)",
        sections: [
            { label: "Top 2 Momentum", content: topContent },
            { label: "Weakest 2 Momentum", content: loserContent }
        ]
    });
}