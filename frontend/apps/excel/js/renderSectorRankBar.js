import { getIndustryColor } from "../../../shared/logic/rankIndustryColors.js";

const BAR_HEIGHT = 144;

function mapRankToY(rank) {
    const safe = Math.max(1, Math.min(144, Number(rank) || 1));
    return ((safe - 1) / 143) * BAR_HEIGHT;
}

export function renderSectorRankBar(container, stats) {
    if (!stats.rankStats || !stats.rankStats.week) {
        console.warn("renderSectorRankBar: fehlende rankStats.week", stats);
        return;
    }

    const { minRank, avgRank, maxRank, heatmapClass } = stats.rankStats.week;

    const bar = document.createElement("div");
    bar.className = `sector-rank-bar ${heatmapClass}`;
    bar.style.height = BAR_HEIGHT + "px";
    bar.style.position = "relative";

    container.innerHTML = "";
    container.appendChild(bar);

    

function addMarker(rank, side, bar) {
    const marker = document.createElement("div");

    // 🔥 1. Korrekte Klassen
    marker.className = `rank-marker ${side === "left" ? "marker-left" : "marker-right"} pfeil-gedreht`;

    // 🔥 2. Korrekte Farbe basierend auf Rang
    const color = getIndustryColor(rank);

    if (side === "left") {
        marker.style.borderRightColor = color;   // Spitze zeigt nach rechts
    } else {
        marker.style.borderLeftColor = color;    // Spitze zeigt nach links
    }

    // 🔥 3. Korrekte Position
    marker.style.top = `${mapRankToY(rank)}px`;

    bar.appendChild(marker);
}


    addMarker(minRank, "left", bar);
addMarker(avgRank, "left", bar);
addMarker(avgRank, "right", bar);
addMarker(maxRank, "right", bar);

}
