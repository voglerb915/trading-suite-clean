export function calculateRanking(sectors) {
    const result = {};
    const timeframes = ["week", "month", "quarter"];

    const sectorNames = Object.keys(sectors);

    // Grundstruktur
    sectorNames.forEach(sector => {
        result[sector] = {};
    });

    timeframes.forEach(tf => {
        const days = sectors[sectorNames[0]][tf].length;

        for (let i = 0; i < days; i++) {
            const entries = sectorNames.map(sector => ({
                sector,
                value: Number(sectors[sector][tf][i])
            }));

            // Sortieren DESC (bester zuerst)
            entries.sort((a, b) => b.value - a.value);

            entries.forEach((entry, index) => {
                // 1 = bester, 11 = schlechtester
                const rank = index + 1;

                if (!result[entry.sector][`${tf}_rank_series`]) {
                    result[entry.sector][`${tf}_rank_series`] = [];
                }

                result[entry.sector][`${tf}_rank_series`].push(rank);
            });
        }
    });

    return result;
}
