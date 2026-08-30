// ---------------------------------------------------------
// renderSectorStats.js
// Rendert den rechten Statistik-Block in jedem SectorTile.
// ---------------------------------------------------------
import { renderSectorRankBar } from "./renderSectorRankBar.js";

export function renderSectorStats(root, stats) {

    if (!root) return;

    // Falls bereits ein Stats-Block existiert → löschen
    const old = root.querySelector(".sector-stats");
    if (old) old.remove();

    // Hauptcontainer
    const container = document.createElement("div");
    container.className = "sector-stats tile-font";

    // -----------------------------------------------------
    // 1. Header: Industrieanzahl + Prozent
    // -----------------------------------------------------
    const header = document.createElement("div");
    header.className = "stats-header";

    const countEl = document.createElement("div");
    countEl.className = "stats-count";
    countEl.textContent = `${stats.top29Count} / ${stats.industryCount}`;

    const percentEl = document.createElement("div");
    percentEl.className = "stats-percent";
    percentEl.textContent = `${Math.round(stats.top29Percent * 100)}%`;

    header.appendChild(countEl);
    header.appendChild(percentEl);

    // -----------------------------------------------------
    // 2. Rank-Bar Container (NEU)
    // -----------------------------------------------------
    const barContainer = document.createElement("div");
    barContainer.className = "sector-rank-bar-container";

    // -----------------------------------------------------
    // 3. Zusammenbauen
    // -----------------------------------------------------
    container.appendChild(header);
    container.appendChild(barContainer);

    // Rechts im Tile einfügen
    root.appendChild(container);

    // -----------------------------------------------------
    // 4. Rank-Bar rendern (NEU)
    // -----------------------------------------------------
    renderSectorRankBar(barContainer, stats);
}
