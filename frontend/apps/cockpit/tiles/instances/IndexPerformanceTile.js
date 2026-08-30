// tiles/instances/IndexPerformanceTile.js

import { SmallTile } from "../templates/SmallTile.js";

export function IndexPerformanceTile() {

    const mock = [
        { name: "NASDAQ", perf: 1.23 },
        { name: "S&P 500", perf: 0.87 },
        { name: "DAX", perf: -0.12 }
    ];

    const body = mock.map(i => `
        <div>
            ${i.name}: 
            <span style="color:${i.perf >= 0 ? '#4caf50' : '#f44336'}">
                ${i.perf >= 0 ? "+" : ""}${i.perf}%
            </span>
        </div>
    `).join("");

    return SmallTile({
        title: "Index Performance",
        body
    });
}
