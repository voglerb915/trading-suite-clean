// tiles/instances/SectorOverviewTile.js

import { SmallTile } from "../templates/SmallTile.js";

export function SectorOverviewTile() {

    const mock = [
        { name: "Technology", perf: 2.1 },
        { name: "Energy", perf: -0.4 },
        { name: "Healthcare", perf: 0.9 }
    ];

    const body = mock.map(s => `
        <div>
            ${s.name}: 
            <span style="color:${s.perf >= 0 ? '#4caf50' : '#f44336'}">
                ${s.perf >= 0 ? "+" : ""}${s.perf}%
            </span>
        </div>
    `).join("");

    return SmallTile({
        title: "Sector Overview",
        body
    });
}
