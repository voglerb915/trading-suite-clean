import { rankColors } from "../../../shared/logic/rankColors.js";

export function renderSectorTile(sectorName, data) {
    const tile = document.createElement("div");
    tile.className = "sector-tile";

    // 1) Header mit Sektorname
    const header = document.createElement("div");
    header.className = "tile-header";
    header.textContent = sectorName;
    tile.appendChild(header);

    // 2) Echte HTML-Tabelle initialisieren
    const table = document.createElement("table");
    table.className = "matrix-table";
    
    // Tabellenkopf für die Spaltenüberschriften
    const thead = document.createElement("thead");
    const headerTr = document.createElement("tr");

    const thRank = document.createElement("th");
    thRank.className = "th-matrix-rank";
    thRank.textContent = "Rank";
    headerTr.appendChild(thRank);

    const thWeek = document.createElement("th");
    thWeek.setAttribute("colspan", "5");
    thWeek.className = "th-matrix-group header-break";
    thWeek.textContent = "Week";
    headerTr.appendChild(thWeek);

    const thMonth = document.createElement("th");
    thMonth.setAttribute("colspan", "5");
    thMonth.className = "th-matrix-group header-break";
    thMonth.textContent = "Month";
    headerTr.appendChild(thMonth);

    const thQuarter = document.createElement("th");
    thQuarter.setAttribute("colspan", "5");
    thQuarter.className = "th-matrix-group";
    thQuarter.textContent = "Quarter";
    headerTr.appendChild(thQuarter);

    thead.appendChild(headerTr);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const wSeries = data.week_rank_series || [];
    const mSeries = data.month_rank_series || [];
    const qSeries = data.quarter_rank_series || [];

    // 11 Zeilen für die Ränge
    for (let r = 1; r <= 11; r++) {
        const tr = document.createElement("tr");

        // Ganz links: Die farbige Rang-Zelle
        const scaleCell = document.createElement("td");
        scaleCell.className = "scale-cell-num";
        scaleCell.style.backgroundColor = rankColors[r] || "#333";
        scaleCell.style.color = (r <= 3 || r >= 10) ? "#fff" : "#000";
        scaleCell.textContent = r;
        tr.appendChild(scaleCell);

        // Die 15 Datenspalten (5x Week, 5x Month, 5x Quarter)
        for (let c = 0; c < 15; c++) {
            const td = document.createElement("td");
            td.className = "matrix-td";

            // Fette schwarze Trennlinie nach Spalte 5 (Index 4) und Spalte 10 (Index 9)
            if (c === 4 || c === 9) {
                td.className += " border-break";
            }

            // Welcher Rang gilt für diesen Tag?
            let targetRank = null;
            if (c < 5) {
                targetRank = wSeries[c];
            } else if (c < 10) {
                targetRank = mSeries[c - 5];
            } else {
                targetRank = qSeries[c - 10];
            }

            // Punkt reinsetzen oder mit unsichtbarem Leerzeichen die Höhe sichern
            if (targetRank === r) {
                const dot = document.createElement("span");
                dot.className = "tile-dot";
                dot.style.backgroundColor = rankColors[r];
                td.appendChild(dot);
            } else {
                // BRANDMAUER GEGEN KOLLABIEREN: Ein echtes, unsichtbares Zeichen einfugen
                td.innerHTML = "&nbsp;";
            }

            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    tile.appendChild(table);

    return tile;
}