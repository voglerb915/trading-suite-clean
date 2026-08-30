const { getDailySignals } = require('../db/getDailySignals');
const { getStocksForList } = require("./stocksService");

async function prepareSignals() {
    const dailySignals = await getDailySignals();
    const allStocks = await getStocksForList();

    // Wir wissen aus der Verifikation, dass der Stichtag 2026-07-28 ist.
    // Alternativ hart auf das echte Datum filtern, das der Worker schreibt.
    const targetDate = '2026-07-28';

    const stockMap = new Map();
    allStocks.forEach(s => {
        if (s && s.ticker) {
            stockMap.set(String(s.ticker).trim().toUpperCase(), s);
        }
    });

    let merged = dailySignals
        .map(signal => {
            // Datum direkt als String vergleichen (YYYY-MM-DD)
            const sigDateStr = signal.date ? new Date(signal.date).toISOString().split('T')[0] : '';
            const daysInTrend = Number(signal.days_in_trend ?? 999);
            const phaseStock = String(signal.phase_stock ?? "").trim();

            // Harte Kriterien entsprechend deiner Vorgabe
            if (sigDateStr !== targetDate) return null;
            if (daysInTrend > 5) return null;
            if (phaseStock < "1" || phaseStock > "6") return null;

            const tickerKey = String(signal.ticker ?? "").trim().toUpperCase();
            const stock = stockMap.get(tickerKey);
            if (!stock) return null;

            return {
                ticker: signal.ticker,
                date: signal.date,
                signal_type: signal.signal_type,
                market_phase: phaseStock,
                days_in_trend: daysInTrend,
                phase_color: signal.phase_color,
                signal_age_index: signal.signal_age_index,
                rs_slow: signal.rs_slow || 0,
                global_rank: stock.rsRank ?? null,
                sector: stock.sector ?? null,
                industry: stock.industry ?? null
            };
        })
        .filter(Boolean);

    const phaseOrder = { '3': 1, '2': 2, '4': 3, '1': 4, '5': 5, '6': 6 };

    merged.sort((a, b) => {
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