// tiles/instances/Top20Tile.js

import { SmallTile } from "../templates/SmallTile.js";

export function Top20Tile(state) {

    const top20 = [...state.stocks]
        .sort((a, b) => (b.rsScore ?? 0) - (a.rsScore ?? 0))
        .slice(0, 5) // nur 5 für die Kachel

    const body = top20.map(s => `
        <div>
            <strong>${s.ticker}</strong> — ${s.rsScore?.toFixed(2)}
        </div>
    `).join("");

    return SmallTile({
        title: "Top RS Stocks",
        body
    });
}
