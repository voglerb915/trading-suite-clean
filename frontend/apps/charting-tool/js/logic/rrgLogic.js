import { sectorClasses } from "../../../../shared/logic/sectorColors.js";
import { sectorTickers } from "../../../../shared/logic/sectorMapping.js";
import GlobalState from "../../../../shared/state/globalState.js";

const sectorHexColors = {
    "sector-tech": "#4A90E2",
    "sector-healthcare": "#D0021B",
    "sector-financial": "#7ED321",
    "sector-industrials": "#F5A623",
    "sector-consumer-cyclical": "#9013FE",
    "sector-consumer-defensive": "#F8E71C",
    "sector-energy": "#8B572A",
    "sector-basic-materials": "#50E3C2",
    "sector-utilities": "#9B9B9B",
    "sector-real-estate": "#FF6F61",
    "sector-communication": "#B565A7"
};

const defaultColor = "#4ea8de";

/* ---------------------------------------------------------
   SECTOR MOMENTUM  (FILTER FIXED)
--------------------------------------------------------- */
export function processSectorMomentumData(rawResult) {
    const sectorsData = Array.isArray(rawResult)
        ? rawResult
        : (rawResult.sectors || rawResult.data || []);

    if (!Array.isArray(sectorsData) || sectorsData.length === 0) {
        return emptyResult();
    }

    const activeSectors = GlobalState.get("activeSectors");

    const datasets = [];
    let allPoints = [];

    sectorsData.forEach(sector => {
        if (sector.history && Array.isArray(sector.history)) {
            allPoints.push(...sector.history);
        }
    });

    if (allPoints.length === 0) return emptyResult();

    const { xMin, xMax, yMin, yMax } = computeAxis(allPoints, -5, 5, -3, 3);

    const sectorTickerMap = sectorTickers;

    sectorsData.forEach(sector => {
        if (!sector.history || sector.history.length === 0) return;

        const sectorName = sector.sector || sector.name || "Unknown";
        const ticker = (sector.ticker || sectorTickerMap[sectorName] || sectorName.substring(0, 4)).toUpperCase();

        // ⭐ FILTER: Sector
        if (activeSectors?.size > 0 && !activeSectors.has(ticker)) return;

        const cssClass = sectorClasses[sectorName];
        const color = sectorHexColors[cssClass] || defaultColor;
        const currentPoint = sector.history.at(-1);

        datasets.push({
            type: "line",
            label: `${ticker} Schweif`,
            data: sector.history,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 2,
            fill: false,
            tension: 0.2,
            order: 2
        });

        datasets.push({
            type: "scatter",
            label: sectorName,
            data: [{
                x: currentPoint.x,
                y: currentPoint.y,
                ticker,
                sector: sectorName
            }],
            backgroundColor: color,
            pointRadius: 7,
            pointHoverRadius: 10,
            order: 1
        });
    });

    return { datasets, xMin, xMax, yMin, yMax };
}

/* ---------------------------------------------------------
   INDUSTRY MOMENTUM (FILTER FIXED)
--------------------------------------------------------- */
export function processIndustryMomentumData(industriesData) {
    if (!Array.isArray(industriesData) || industriesData.length === 0) {
        return emptyResult();
    }

    const activeSectors = GlobalState.get("activeSectors");
    const activeQuadrants = GlobalState.get("activeQuadrants");

    const sectorTickerMap = sectorTickers;

    const filtered = industriesData.filter(ind => {
        if (!ind.history || ind.history.length === 0) return false;

        const sectorName = ind.sector;
        const ticker = sectorTickerMap[sectorName];

        // ⭐ FILTER: Sector
        if (activeSectors?.size > 0 && ticker && !activeSectors.has(ticker)) return false;

        const currentPoint = ind.history.at(-1);
        const quadKey = determineQuadrant(currentPoint);

        // ⭐ FILTER: Quadrant
        if (activeQuadrants?.size > 0 && !activeQuadrants.has(quadKey)) return false;

        return true;
    });

    if (filtered.length === 0) return emptyResult();

    let allPoints = [];
    filtered.forEach(ind => allPoints.push(...ind.history));

    const { xMin, xMax, yMin, yMax } = computeAxis(allPoints, -5, 5, -3, 3);

    const datasets = [];

    filtered.forEach(ind => {
        const cssClass = sectorClasses[ind.sector];
        const color = sectorHexColors[cssClass] || defaultColor;
        const currentPoint = ind.history.at(-1);

        const labelText = ind.industry;
        const ticker = labelText.length > 8
            ? labelText.substring(0, 6).toUpperCase() + "."
            : labelText.toUpperCase();

        datasets.push({
            type: "line",
            label: `${labelText} Schweif`,
            data: ind.history,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 1.2,
            borderDash: [3, 3],
            pointRadius: 1.5,
            fill: false,
            tension: 0.2,
            order: 2
        });

        datasets.push({
            type: "scatter",
            label: labelText,
            data: [{
                x: currentPoint.x,
                y: currentPoint.y,
                label: labelText,
                sector: ind.sector,
                ticker,
                color,
                date: currentPoint.date
            }],
            backgroundColor: color,
            pointRadius: 6,
            pointHoverRadius: 9,
            order: 1
        });
    });

    return { datasets, xMin, xMax, yMin, yMax };
}

/* ---------------------------------------------------------
   STOCK MOMENTUM (FILTER FIXED)
--------------------------------------------------------- */
export function processStockMomentumData(result, indexKey) {
    const rawData = result[indexKey] || result.SP500;

    let stocksData = [];
    if (rawData?.top) {
        stocksData = [...rawData.top, ...rawData.losers];
    } else if (Array.isArray(result)) {
        stocksData = result;
    }

    if (!Array.isArray(stocksData) || stocksData.length === 0) {
        return emptyResult();
    }

    const activeSectors = GlobalState.get("activeSectors");
    const activeQuadrants = GlobalState.get("activeQuadrants");

    const datasets = [];
    let allPoints = [];

    stocksData.forEach(stock => {
        if (stock.history && Array.isArray(stock.history)) {
            allPoints.push(...stock.history);
        }
    });

    if (allPoints.length === 0) return emptyResult();

    const { xMin, xMax, yMin, yMax } = computeAxis(allPoints, -10, 10, -5, 5);

    const sectorTickerMap = sectorTickers;

    stocksData.forEach(stock => {
        if (!stock.history || stock.history.length === 0) return;

        const sectorName = stock.sector;
        const ticker = sectorTickerMap[sectorName];

        // ⭐ FILTER: Sector
        if (activeSectors?.size > 0 && ticker && !activeSectors.has(ticker)) return;

        const currentPoint = stock.history.at(-1);
        const quadKey = determineQuadrant(currentPoint);

        // ⭐ FILTER: Quadrant
        if (activeQuadrants?.size > 0 && !activeQuadrants.has(quadKey)) return;

        const cssClass = sectorClasses[sectorName];
        const color = sectorHexColors[cssClass] || defaultColor;
        const stockTicker = stock.ticker.toUpperCase();

        datasets.push({
            type: "line",
            label: `${stockTicker} Schweif`,
            data: stock.history,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 1.2,
            borderDash: [3, 3],
            pointRadius: 1.5,
            fill: false,
            tension: 0.2,
            order: 2
        });

        datasets.push({
            type: "scatter",
            label: stock.name || stockTicker,
            data: [{
                x: currentPoint.x,
                y: currentPoint.y,
                label: stock.company || stock.name,
                sector: stock.sector,
                ticker: stockTicker,
                color,
                date: currentPoint.date
            }],
            backgroundColor: color,
            pointRadius: 6,
            pointHoverRadius: 9,
            order: 1
        });
    });

    return { datasets, xMin, xMax, yMin, yMax };
}

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */
function emptyResult() {
    return { datasets: [], xMin: 0, xMax: 0, yMin: 0, yMax: 0 };
}

function computeAxis(points, minXClamp, maxXClamp, minYClamp, maxYClamp) {
    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);

    const xMin = Math.min(Math.floor(Math.min(...xValues, 0) * 1.2), minXClamp);
    const xMax = Math.max(Math.ceil(Math.max(...xValues, 0) * 1.2), maxXClamp);
    const yMin = Math.min(Math.floor(Math.min(...yValues, 0) * 1.2), minYClamp);
    const yMax = Math.max(Math.ceil(Math.max(...yValues, 0) * 1.2), maxYClamp);

    return { xMin, xMax, yMin, yMax };
}

function determineQuadrant(p) {
    if (p.x >= 0 && p.y >= 0) return "leading";
    if (p.x < 0 && p.y >= 0) return "improving";
    if (p.x < 0 && p.y < 0) return "lagging";
    return "weakening";
}
