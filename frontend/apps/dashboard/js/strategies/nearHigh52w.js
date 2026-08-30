export function nearHigh52w(stocks) {
    return stocks
        .filter(s =>
            typeof s["52w_high"] === "number" &&
            s["52w_high"] >= -5 &&
            s["52w_high"] <= 0 &&
            s.industry !== "Shell Companies"
        )
        .sort((a, b) => b["52w_high"] - a["52w_high"])
        .map((row, index) => ({
            ...row,
            strategyRank: index + 1,
            strategyValue: row["52w_high"],   // ⭐ WICHTIG
            value: row["52w_high"]
        }));
}
