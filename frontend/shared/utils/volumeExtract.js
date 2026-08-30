export function computeVolumeExtract(list) {

    // 1) Top 40 Turnover
    const topTurnover = [...list]
        .sort((a, b) => b.turnover - a.turnover)
        .slice(0, 40);

    // 2) Top 40 Volume
    const topVolume = [...list]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 40);

    // 3) Top 40 Ratio
    const topRatio = [...list]
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 40);

    // 4) Schnittmenge
    const intersection = topTurnover.filter(a =>
        topVolume.some(b => b.ticker === a.ticker) &&
        topRatio.some(c => c.ticker === a.ticker)
    );

    // 5) Strength‑Filter
    const strongOnly = intersection.filter(item => {

        // Close-to-Close %
        const c2c = item.prevClose
            ? ((item.close - item.prevClose) / item.prevClose) * 100
            : null;

        // Retracement %
        const retr = item.high
            ? ((item.close / item.high) - 1) * 100
            : null;

        return (
            c2c !== null && c2c >= 0 &&
            retr !== null && retr >= -25
        );
    });

    return strongOnly;
}
