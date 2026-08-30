// apps/focus-panel/tiles/instances/industryOverviewTile.js
import { LargeTile } from "../templates/largeTile.js";

export async function IndustryOverviewTile() {
    let top10Content = "<div>Lade Daten...</div>";
    let loser10Content = "<div>Lade Daten...</div>";

    try {
        const response = await fetch('http://localhost:4000/api/market/industries/momentum?days=5');
        if (!response.ok) throw new Error("Netzwerkfehler");
        
        const data = await response.json();

        // Nach Momentum (letzter History-Punkt y oder .momentum) absteigend sortieren
        const sorted = [...data].sort((a, b) => {
            const momA = a.history ? a.history[a.history.length - 1].y : (a.momentum || 0);
            const momB = b.history ? b.history[b.history.length - 1].y : (b.momentum || 0);
            return momB - momA;
        });

        const top10 = sorted.slice(0, 10);
        const loser10 = sorted.slice(-10); // .reverse() entfernt für einheitliche Sortierung

        const renderRows = (items) => items.map(item => {
            const name = item.industry || item.name;
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

        top10Content = renderRows(top10);
        loser10Content = renderRows(loser10);

    } catch (err) {
        top10Content = `<div style="color: #f44336; font-size: 0.8rem;">Fehler beim Laden</div>`;
        loser10Content = `<div style="color: #f44336; font-size: 0.8rem;">Fehler beim Laden</div>`;
    }

    return LargeTile({
        title: "Industry Momentum (Top 10 / Loser 10)",
        sections: [
            { label: "Top 10 Momentum", content: top10Content },
            { label: "Weakest 10 Momentum", content: loser10Content }
        ]
    });
}