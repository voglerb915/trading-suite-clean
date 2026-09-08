import { getSectorData, getIndustryData, getStockData } from "../api/dataCache.js";
import { SectorOverviewTile } from "../tiles/instances/sectorOverviewTile.js";
import { IndustryOverviewTile } from "../tiles/instances/industryOverviewTile.js";
import { StockOverviewTile } from "../tiles/instances/stockOverviewTile.js";

export async function loadTiles() {
    const [
        sectorsData,
        industriesData,
        sp500Data,
        ndxData,
        djiData,
        rutData,
        noneData
    ] = await Promise.all([
        getSectorData(),
        getIndustryData(),
        getStockData("SP500"),
        getStockData("NDX"),
        getStockData("DJI"),
        getStockData("RUT"),
        getStockData("NONE")
    ]);

    const tiles = [
        SectorOverviewTile(sectorsData),
        IndustryOverviewTile(industriesData),
        StockOverviewTile("SP500", "S&P 500", sp500Data),
        StockOverviewTile("NDX", "Nasdaq 100", ndxData),
        StockOverviewTile("DJI", "Dow Jones", djiData),
        StockOverviewTile("RUT", "Russell 2000", rutData),
        StockOverviewTile("NONE", "Other Stocks", noneData)
    ];

    return tiles;
}