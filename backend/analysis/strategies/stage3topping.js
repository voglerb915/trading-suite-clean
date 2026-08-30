export function stage3topping(stocks, industryMap, totalInd) {
    if (!Array.isArray(stocks)) return [];

    return stocks
        .map(stock => {
            const priceNow = parseFloat(stock.price || 0);
            const priceOld = parseFloat(stock.price_old || 0);

            if (priceNow <= 12 || stock.perf_year == null) {
                return { stock, score: 0 };
            }

            let score = 0;

            // 1) Lupfer
            const currentDist = parseFloat(stock.current_dist ?? 0);
            const startDist = parseFloat(stock.old_dist ?? 0);
            const maxDistSince = parseFloat(stock.max_dist ?? 0);

            const startedBelow = startDist < 0;
            const peakedAbove = maxDistSince > 0;
            const isBelowNow = currentDist < 0;

            const isLupfer = startedBelow && peakedAbove && isBelowNow;
            if (isLupfer) score += 50;

            // 2) SMA Trend
            const priceChange = priceOld > 0 ? Math.abs(priceNow - priceOld) / priceOld : 0;
            const isSplitJump = priceChange > 0.40;

            if (!isSplitJump) {
                const smaSlope = Math.abs(parseFloat(stock.sma_slope_percent ?? stock.sma_slope ?? 0));
                if (smaSlope < 5) {
                    score += 30 * (1 - Math.pow(smaSlope / 5, 2));
                }
            }

            // 3) Industrie Schwäche
            const currentIndRank = industryMap.get(stock.industry) ?? (totalInd / 2);
            score += (currentIndRank / totalInd) * 25;

            // 4) Frische
            score += Math.max(0, 10 - Math.abs(currentDist));

            return { stock, score };
        })
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.stock);
}
