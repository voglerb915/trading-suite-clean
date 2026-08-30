const { sql, config } = require('../../db/connection');
const { calculateRsScoreWoNFromDb } = require('./rsScoreWoNFromDb');
// Wir nutzen dieselbe Filter-Logik aus dem Shared-Bereich
const { isRealStock } = require('../../../frontend/shared/logic/stockFilter.js');

async function buildEtfRsSnapshot() {
  await sql.connect(config);

  const result = await sql.query(`
    SELECT *
    FROM trading.dbo.finviz
    WHERE anl_datum = (SELECT MAX(anl_datum) FROM trading.dbo.finviz)
      AND ticker IS NOT NULL;
  `);

  // 🟢 INVERSER FILTER: Wenn es KEINE echte Aktie ist, ist es ein ETF!
  const rows = result.recordset.filter(r => !isRealStock(r));

  let etfs = rows.map(row => {
    const rs = calculateRsScoreWoNFromDb(row);

    return {
      ticker: row.ticker,
      name: row.company,
      // Bei ETFs füllen wir Sektor/Industrie oft als "ETF" ab, falls Finviz dort nichts liefert
      sector: row.sector || "ETF", 
      industry: row.industry || "ETF",
      score: rs.score,
      rankWonDb: 0,

      diffD: 0,
      diffW: 0,
      diffM: 0,
      diffQ: 0,

      perf_week: row.perf_week,
      perf_month: row.perf_month,
      perf_quart: row.perf_quart,
      perf_half: row.perf_half,
      perf_year: row.perf_year,

      data: [
        {
          date: row.anl_datum.toISOString().slice(0, 10),
          change: row.perf_week
        }
      ],

      anl_datum: row.anl_datum
    };
  });

  etfs.sort((a, b) => b.score - a.score);
  etfs.forEach((e, i) => e.rankWonDb = i + 1);

  return etfs;
}

module.exports = { buildEtfRsSnapshot };