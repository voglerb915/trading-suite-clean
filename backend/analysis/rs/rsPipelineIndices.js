const { yahooPool } = require('../../db/connection');
const { calculateRsScoreWoNFromDb } = require('./rsScoreWoNFromDb');

async function buildIndicesRsSnapshot() {
    // 1. Indizes und deren Historie aus der Yahoo-Datenbank abrufen
    const result = await yahooPool.request().query(`
        SELECT 
            i.index_id,
            i.index_name,
            i.ticker,
            h.date,
            h.close
        FROM yahoo.dbo.indices i
        LEFT JOIN yahoo.dbo.IndexHistory h ON h.index_id = i.index_id
        ORDER BY i.index_id, h.date DESC;
    `);

    // 2. Nach index_id gruppieren
    const grouped = {};
    for (const row of result.recordset) {
        if (!grouped[row.index_id]) {
            grouped[row.index_id] = {
                index_id: row.index_id,
                name: row.index_name,
                ticker: row.ticker,
                history: []
            };
        }
        if (row.date && row.close != null) {
            grouped[row.index_id].history.push({
                date: row.date,
                close: row.close
            });
        }
    }

    let indices = [];

    // 3. Performance und RS-Score pro Index aus der Historie berechnen
    for (const id in grouped) {
        const ind = grouped[id];
        const history = ind.history; // Ist bereits nach Datum DESC sortiert

        if (history.length === 0) continue;

        const latestClose = history[0].close;

        // Hilfsfunktion: Prozentuale Veränderung zum Handelstag vor X Tagen
        const getPerf = (daysAgo) => {
            if (history.length > daysAgo && history[daysAgo].close) {
                const pastClose = history[daysAgo].close;
                return ((latestClose - pastClose) / pastClose) * 100;
            }
            return 0;
        };

        // Annäherung der Perioden über Handelstage (ca. Werte bei täglicher Historie)
        // 5 Tage = 1 Woche, 21 Tage = 1 Monat, 63 Tage = 3 Monate, usw.
        const perf_week = getPerf(5);
        const perf_month = getPerf(21);
        const perf_quart = getPerf(63);
        const perf_half = getPerf(history.length > 126 ? 126 : history.length - 1);
        const perf_year = getPerf(history.length > 252 ? 252 : history.length - 1);

        const perfData = {
            perf_week,
            perf_month,
            perf_quart,
            perf_half,
            perf_year
        };

        const rs = calculateRsScoreWoNFromDb(perfData);

        indices.push({
            ticker: ind.ticker,
            name: ind.name,
            score: rs.score,
            rankWonDb: 0,
            perf_week,
            perf_month,
            perf_quart,
            perf_half,
            perf_year,
            data: history.slice(0, 70).map(h => ({
                date: h.date instanceof Date ? h.date.toISOString().slice(0, 10) : h.date,
                change: h.close
            })),
            anl_datum: history[0].date
        });
    }

    // 4. Sortieren nach Score und Ränge vergeben
    indices.sort((a, b) => b.score - a.score);
    indices.forEach((s, i) => s.rankWonDb = i + 1);

    return indices;
}

module.exports = { buildIndicesRsSnapshot };