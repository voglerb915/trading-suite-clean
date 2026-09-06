// focus-panel/logic/tileLoader.js

import { SectorOverviewTile } from "../tiles/instances/sectorOverviewTile.js";
import { IndustryOverviewTile } from "../tiles/instances/industryOverviewTile.js";
import { StockOverviewTile } from "../tiles/instances/stockOverviewTile.js";

// filterState wird NICHT mehr übergeben, weil deine Tiles es nicht nutzen.
// applyFilters zieht sich filterState selbst.

export async function loadTiles() {
    const tiles = [];

    tiles.push(await SectorOverviewTile());
    tiles.push(await IndustryOverviewTile());
    tiles.push(await StockOverviewTile("SP500", "S&P 500"));
    tiles.push(await StockOverviewTile("NDX", "Nasdaq 100"));
    tiles.push(await StockOverviewTile("DJI", "Dow Jones"));
    tiles.push(await StockOverviewTile("RUT", "Russell 2000"));
    tiles.push(await StockOverviewTile("NONE", "Other Stocks"));

    return tiles;
}

