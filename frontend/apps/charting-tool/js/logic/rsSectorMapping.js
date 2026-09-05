// js/rs/logic/rsSectorMapping.js

/**
 * Mapping: Ticker → Sektorname
 */
const tickerToSector = {
    "XLK": "Technology",
    "XLF": "Financial",
    "XLE": "Energy",
    "XLU": "Utilities",
    "XLI": "Industrials",
    "XLY": "Consumer Cyclical",
    "XLP": "Consumer Defensive",
    "XLV": "Healthcare",
    "XLB": "Basic Materials",
    "XLRE": "Real Estate",
    "XLC": "Communication Services"
};

/**
 * Mapping: Sektorname → Ticker
 */
const sectorToTicker = {
    "Technology": "XLK",
    "Financial": "XLF",
    "Financial Services": "XLF",
    "Energy": "XLE",
    "Utilities": "XLU",
    "Industrials": "XLI",
    "Consumer Cyclical": "XLY",
    "Consumer Defensive": "XLP",
    "Healthcare": "XLV",
    "Health Care": "XLV",
    "Basic Materials": "XLB",
    "Materials": "XLB",
    "Real Estate": "XLRE",
    "Communication Services": "XLC"
};

/**
 * Ticker → Sektorname
 */
export function getSectorNameFromTicker(ticker) {
    return tickerToSector[ticker] || null;
}

/**
 * Sektorname → Ticker
 */
export function getTickerFromSectorName(sectorName) {
    if (!sectorName) return null;
    return sectorToTicker[sectorName.trim()] || null;
}

/**
 * Prüft, ob ein Sektor aktiv ist (Set enthält Ticker)
 */
export function isSectorActive(sectorName, activeSet) {
    if (!sectorName || !activeSet) return false;
    const ticker = getTickerFromSectorName(sectorName);
    return ticker ? activeSet.has(ticker) : false;
}
