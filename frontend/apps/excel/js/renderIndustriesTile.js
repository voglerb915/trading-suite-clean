export function renderIndustriesTile(industriesData) {
    const tile = document.createElement("div");
    tile.className = "sector-tile industries-tile";

    const header = document.createElement("div");
    header.className = "tile-header";
    header.textContent = "Industriezweige Top 20%";
    tile.appendChild(header);

    const table = document.createElement("table");
    table.className = "matrix-table industries-table";

    const thead = document.createElement("thead");
    const tr1 = document.createElement("tr");

    const thSector = document.createElement("th");
    thSector.rowSpan = 2;
    thSector.textContent = "Sector";
    thSector.className = "th-matrix-rank";
    tr1.appendChild(thSector);

    ["Week", "Month", "Quarter"].forEach((label, i) => {
        const th = document.createElement("th");
        th.colSpan = 3;
        th.className = "th-matrix-group" + (i < 2 ? " header-break" : "");
        th.textContent = label;
        tr1.appendChild(th);
    });

    thead.appendChild(tr1);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    industriesData.forEach(row => {
        const tr = document.createElement("tr");

        const tdSector = document.createElement("td");
        tdSector.className = "excel-sector industries-sector-cell";
        tdSector.textContent = row.sector;
        tr.appendChild(tdSector);

        row.top29.week.forEach(v => {
            const td = document.createElement("td");
            td.className = "excel-rank industries-value-cell";
            td.textContent = v;
            tr.appendChild(td);
        });

        row.top29.month.forEach(v => {
            const td = document.createElement("td");
            td.className = "excel-rank industries-value-cell";
            td.textContent = v;
            tr.appendChild(td);
        });

        row.top29.quarter.forEach(v => {
            const td = document.createElement("td");
            td.className = "excel-rank industries-value-cell";
            td.textContent = v;
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tile.appendChild(table);

    return tile;
}
