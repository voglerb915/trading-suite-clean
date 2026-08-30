import { renderSectorTile } from "./renderSectorsTile.js";
import { renderIndustriesTile } from "./renderIndustriesTile.js";
import { calculateRanking } from "../../../shared/logic/calculateRanking.js";
import { buildIndustriesOverviewData } from "../../../shared/logic/industriesOverview.js";
import { renderSectorRankBar } from "./renderSectorRankBar.js";

export function renderSectorsOverview(targetId, sectors, industries) {

    const container = document.getElementById(targetId);
    container.innerHTML = "";

    const industriesOverview = buildIndustriesOverviewData(industries);

    const gridWrapper = document.createElement("div");
    gridWrapper.className = "matrix-dashboard-wrapper";

    const rankingData = calculateRanking(sectors);
    const sectorNames = Object.keys(rankingData);

    sectorNames.forEach(sectorName => {

        const tile = renderSectorTile(sectorName, rankingData[sectorName]);

        const overviewEntry = industriesOverview.find(o => o.sector === sectorName);
        if (!overviewEntry) return;

        const statsContainer = document.createElement("div");
        statsContainer.className = "sector-stats";

        const headerStats = document.createElement("div");
        headerStats.className = "stats-header";
        const top = overviewEntry.top29.week[0];
const total = overviewEntry.industryCount;
const percent = Math.round((top / total) * 100);

headerStats.innerHTML = `
    <div class="stats-count">${top} / ${total}</div>
    <div class="stats-percent">${percent}%</div>
`;

        statsContainer.appendChild(headerStats);

        const barContainer = document.createElement("div");
        barContainer.className = "sector-rank-bar-container";
        statsContainer.appendChild(barContainer);

        renderSectorRankBar(barContainer, overviewEntry);

        tile.appendChild(statsContainer);
        gridWrapper.appendChild(tile);
    });

    const industriesTile = renderIndustriesTile(industriesOverview);
    gridWrapper.appendChild(industriesTile);

    container.appendChild(gridWrapper);
}
