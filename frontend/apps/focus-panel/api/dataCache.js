// focus-panel/api/dataCache.js

let cache = {
    sectors: null,
    industries: null,
    stocks: {} // Keyed by universeKey e.g. stocks['SP500']
};

export async function getSectorData() {
    if (!cache.sectors) {
        const res = await fetch("http://localhost:4000/api/market/sectors/momentum?days=5");
        cache.sectors = await res.json();
    }
    return cache.sectors;
}

export async function getIndustryData() {
    if (!cache.industries) {
        const res = await fetch("http://localhost:4000/api/market/industries/momentum?days=5");
        cache.industries = await res.json();
    }
    return cache.industries;
}

export async function getStockData(universeKey) {
    if (!cache.stocks[universeKey]) {
        const res = await fetch(`http://localhost:4000/api/market/stocks/momentum?days=5&universe=${universeKey}`);
        cache.stocks[universeKey] = await res.json();
    }
    return cache.stocks[universeKey];
}