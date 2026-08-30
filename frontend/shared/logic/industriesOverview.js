function normalizeRank(value) {
    const rank = Math.round(Number(value));
    return Math.max(1, Math.min(144, rank));
}

export function calculateIndustryRanking(industries) {
    const result = {};
    const timeframes = ["week", "month", "quarter"];
    const names = Object.keys(industries);

    names.forEach(name => result[name] = {});

    timeframes.forEach(tf => {
        const days = industries[names[0]][tf].length;

        for (let i = 0; i < days; i++) {
            const entries = names.map(name => ({
                name,
                value: Number(industries[name][tf][i])
            }));

            entries.sort((a, b) => b.value - a.value);

            entries.forEach((entry, index) => {
                const rank = normalizeRank(index + 1);

                if (!result[entry.name][`${tf}_rank_series`]) {
                    result[entry.name][`${tf}_rank_series`] = [];
                }

                result[entry.name][`${tf}_rank_series`].push(rank);
            });
        }
    });

    return result;
}

function calculateSectorStatsFromIndustries(industries, ranking) {
    const sectors = {};

    Object.entries(industries).forEach(([industryName, ind]) => {
        const sector = ind.sector;
        if (!sectors[sector]) sectors[sector] = [];
        sectors[sector].push(industryName);
    });

    const result = {};

    Object.entries(sectors).forEach(([sector, inds]) => {
        const ranksWeek    = inds.map(ind => ranking[ind].week_rank_series[0]);
        const ranksMonth   = inds.map(ind => ranking[ind].month_rank_series[0]);
        const ranksQuarter = inds.map(ind => ranking[ind].quarter_rank_series[0]);

        function calcStats(ranks) {
            const minRank = Math.min(...ranks);
            const maxRank = Math.max(...ranks);
            const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
            return { minRank, maxRank, avgRank };
        }

        result[sector] = {
            rankStats: {
                week:    calcStats(ranksWeek),
                month:   calcStats(ranksMonth),
                quarter: calcStats(ranksQuarter)
            },
            industryCount: inds.length
        };
    });

    return result;
}

function countTop29BySector(industries, ranking, timeframe) {
    const result = {};

    Object.entries(industries).forEach(([name, ind]) => {
        const sector = ind.sector;
        if (!result[sector]) result[sector] = [0, 0, 0];

        const ranks = ranking[name][`${timeframe}_rank_series`];

        for (let i = 0; i < 3; i++) {
            if (ranks[i] <= 29) result[sector][i]++;
        }
    });

    return result;
}

function rankToHeatmap(avgRank) {
    if (avgRank <= 24) return "hm-6";
    if (avgRank <= 48) return "hm-5";
    if (avgRank <= 72) return "hm-4";
    if (avgRank <= 96) return "hm-3";
    if (avgRank <= 120) return "hm-2";
    return "hm-1";
}

export function buildIndustriesOverviewData(industries) {
    const ranking = calculateIndustryRanking(industries);
    const sectorStats = calculateSectorStatsFromIndustries(industries, ranking);

    const weekCounts    = countTop29BySector(industries, ranking, "week");
    const monthCounts   = countTop29BySector(industries, ranking, "month");
    const quarterCounts = countTop29BySector(industries, ranking, "quarter");

    const allSectors = new Set([
        ...Object.keys(weekCounts),
        ...Object.keys(monthCounts),
        ...Object.keys(quarterCounts)
    ]);

    const overview = [...allSectors].map(sector => {
        const stats = sectorStats[sector];

        return {
            sector,
            industryCount: stats.industryCount,

            top29: {
                week:    weekCounts[sector]    ?? [0, 0, 0],
                month:   monthCounts[sector]   ?? [0, 0, 0],
                quarter: quarterCounts[sector] ?? [0, 0, 0]
            },

            rankStats: {
                week: {
                    ...stats.rankStats.week,
                    heatmapClass: rankToHeatmap(stats.rankStats.week.avgRank)
                },
                month: stats.rankStats.month,
                quarter: stats.rankStats.quarter
            }
        };
    });

    overview.sort((a, b) => a.sector.localeCompare(b.sector));

    return overview;
}
