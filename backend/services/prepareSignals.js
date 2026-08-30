const { getDailySignals } = require('../db/getDailySignals');
const { getStocksForList } = require("./stocksService");

async function prepareSignals() {
    const dailySignals = await getDailySignals();
    const allStocks = await getStocksForList();

    let merged = dailySignals
        .map(signal => {
            const stock = allStocks.find(s => s.ticker === signal.ticker);
            if (!stock) return null;

            return {
                ticker: signal.ticker,
                date: signal.date,
                signal_type: signal.signal_type,
                market_phase: signal.phase_stock,
                days_in_trend: signal.days_in_trend,
                phase_color: signal.phase_color,
                signal_age_index: signal.signal_age_index,
                rs_slow: signal.rs_slow || 0,

                // Basestock Felder
                global_rank: stock.rsRank ?? null,
                sector: stock.sector ?? null,
                industry: stock.industry ?? null
            };
        })
        .filter(Boolean);

    const phaseOrder = { '3': 1, '2': 2, '4': 3, '1': 4, '5': 5, '6': 6 };

    merged.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateB - dateA !== 0) return dateB - dateA;

        const pA = phaseOrder[a.market_phase] || 99;
        const pB = phaseOrder[b.market_phase] || 99;
        if (pA !== pB) return pA - pB;

        if (a.signal_type !== b.signal_type) {
            return a.signal_type === 'LONG' ? -1 : 1;
        }

        return (b.rs_slow || 0) - (a.rs_slow || 0);
    });

    return merged;
}

module.exports = { prepareSignals };
