/**
 * Strategy: 52-Week-High (nur Aktien)
 *
 * Liefert NUR Aktien, die HEUTE ein neues 52W-Hoch gemacht haben.
 */

export function strategy52wHigh(stocks) {
    return stocks
        .filter(row =>
            typeof row["52w_high"] === "number" &&
            row["52w_high"] > 0 &&
            ![
                "Exchange Traded Fund",
                "Closed-End Fund - Debt",
                "Closed-End Fund - Equity",
                "Closed-End Fund - Foreign"
            ].includes(row.industry)
        )
        .sort((a, b) => (b["52w_high"] ?? 0) - (a["52w_high"] ?? 0))
        .map((row, index) => ({
            ...row,
            strategyRank: index + 1,
            strategyValue: row["52w_high"],   // ⭐ WICHTIG
            value: row["52w_high"]            // optional, aber hilfreich
        }));
}

