/**
 * Strategy: 52-Week-High (nur Aktien)
 *
 * Liefert NUR Aktien, die HEUTE ein neues 52W-Hoch gemacht haben.
 */

function isStock(row) {
    return ![
        "Exchange Traded Fund",
        "Closed-End Fund - Debt",
        "Closed-End Fund - Equity",
        "Closed-End Fund - Foreign"
    ].includes(row.industry);
}

function strategy52wHigh(finvizRows) {
    const candidates = finvizRows
        .filter(row =>
            row._52w_high > 0 &&   // neues 52W-Hoch
            isStock(row)           // NUR Aktien
        )
        .sort((a, b) => (b._52w_high ?? 0) - (a._52w_high ?? 0));

    return candidates.map((row, index) => ({
        ticker: row.ticker,
        strategyRank: index + 1,
        strategyValue: row._52w_high,
        industry: row.industry
    }));
}

module.exports = { strategy52wHigh };
