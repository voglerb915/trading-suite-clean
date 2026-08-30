import {
    rankSectorColors,
    getSectorColor,
    getTextColor
} from "../../../shared/logic/rankSectorColors.js";
import { sectorClasses } from "../../../shared/logic/sectorColors.js";


export function renderSectorTile(sectorName, data) {
    const tile = document.createElement("div");
    tile.className = "sector-tile";

    const header = document.createElement("div");
    header.className = "tile-header";
    header.textContent = sectorName;
    tile.appendChild(header);

    const sectorClass = sectorClasses[sectorName];
    if (sectorClass) {
        header.classList.add(sectorClass);
    }

    const table = document.createElement("table");
    table.className = "matrix-table";

    const thead = document.createElement("thead");
    const headerTr = document.createElement("tr");

    const thRank = document.createElement("th");
    thRank.className = "th-matrix-rank";
    thRank.textContent = "Rank";
    headerTr.appendChild(thRank);

    const thWeek = document.createElement("th");
    thWeek.setAttribute("colspan", "6");
    thWeek.className = "th-matrix-group header-break";
    thWeek.textContent = "Week";
    headerTr.appendChild(thWeek);

    const thMonth = document.createElement("th");
    thMonth.setAttribute("colspan", "6");
    thMonth.className = "th-matrix-group header-break";
    thMonth.textContent = "Month";
    headerTr.appendChild(thMonth);

    const thQuarter = document.createElement("th");
    thQuarter.setAttribute("colspan", "6");
    thQuarter.className = "th-matrix-group";
    thQuarter.textContent = "Quarter";
    headerTr.appendChild(thQuarter);

    thead.appendChild(headerTr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const wSeries = data.week_rank_series || [];
    const mSeries = data.month_rank_series || [];
    const qSeries = data.quarter_rank_series || [];

    for (let r = 1; r <= 11; r++) {
        const tr = document.createElement("tr");

        const scaleCell = document.createElement("td");
scaleCell.className = "scale-cell-num";

const bg = getSectorColor(r);
const fg = getTextColor(bg);

scaleCell.style.backgroundColor = bg;
scaleCell.style.setProperty("color", fg, "important");  // 🔥 garantiert lesbar
scaleCell.textContent = r;

tr.appendChild(scaleCell);


        for (let c = 0; c < 18; c++) {
            const td = document.createElement("td");
            td.className = "matrix-td";

            if (c === 5 || c === 11) {
                td.className += " border-break";
            }

            let targetRank = null;
            if (c < 6) {
                targetRank = wSeries[c];
            } else if (c < 12) {
                targetRank = mSeries[c - 6];
            } else {
                targetRank = qSeries[c - 12];
            }

            if (targetRank === r) {
                const dot = document.createElement("span");
                dot.className = "tile-dot";
                dot.style.backgroundColor = getSectorColor(r);
                td.appendChild(dot);
            }

            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    tile.appendChild(table);

    return tile;
}
