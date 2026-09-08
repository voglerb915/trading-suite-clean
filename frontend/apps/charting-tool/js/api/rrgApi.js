// apps/charting-tool/js/api/chartingApi.js

let cache = {
    sectors: null,
    industries: {},
    stocks: {}
};

export async function fetchSectorMomentum() {
    if (!cache.sectors) {
        const response = await fetch("http://localhost:4000/api/market/sectors/momentum");
        if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
        cache.sectors = await response.json();
    }
    return cache.sectors;
}

export async function fetchIndustryMomentum(days = 5) {
    if (!cache.industries[days]) {
        const response = await fetch(`http://localhost:4000/api/market/industries/momentum?days=${days}`);
        if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
        cache.industries[days] = await response.json();
    }
    return cache.industries[days];
}

export async function fetchStockMomentum(index, days = 5) {
    const cacheKey = `${index}_${days}`;
    if (!cache.stocks[cacheKey]) {
        const response = await fetch(`http://localhost:4000/api/market/stocks/momentum?index=${index}&days=${days}`);
        if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
        cache.stocks[cacheKey] = await response.json();
    }
    return cache.stocks[cacheKey];
}

// Optional: Cache invalidieren, falls Daten erzwungen neu geladen werden müssen
export function clearChartingCache() {
    cache = {
        sectors: null,
        industries: {},
        stocks: {}
    };
}