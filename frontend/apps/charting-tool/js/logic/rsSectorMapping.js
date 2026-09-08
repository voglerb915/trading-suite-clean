// js/rs/logic/rsSectorMapping.js

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

const sectorToTicker = {
    "Technology": "XLK",
    "Financial": "XLF",
    "Energy": "XLE",
    "Utilities": "XLU",
    "Industrials": "XLI",
    "Consumer Cyclical": "XLY",
    "Consumer Defensive": "XLP",
    "Healthcare": "XLV",
    "Basic Materials": "XLB",
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
/**
 * Sektorname oder Ticker → Ticker (robust gegen beide Eingaben)
 */
export function getTickerFromSectorName(input) {
    if (!input) return null;
    const trimmed = input.trim();
    
    // Falls es bereits ein bekannter Ticker ist (z.B. "XLU"), direkt zurückgeben
    if (tickerToSector[trimmed]) {
        return trimmed;
    }
    
    // Ansonsten den Klartext-Namen in den Ticker übersetzen
    return sectorToTicker[trimmed] || null;
}

/**
 * Prüft, ob ein Sektor aktiv ist
 */
export function isSectorActive(sectorName, activeSet) {
    if (!sectorName || !activeSet) return false;
    const ticker = getTickerFromSectorName(sectorName);
    return ticker ? activeSet.has(ticker) : false;
}