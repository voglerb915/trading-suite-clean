const { sql, config } = require('../../db/connection');
const { calculateRsScoreWoNFromDb } = require('./rsScoreWoNFromDb');
const { isRealStock } = require('../../../frontend/shared/logic/stockFilter.js');

async function buildStockRsSnapshot() {
  await sql.connect(config);

  const result = await sql.query(`
    SELECT *
    FROM trading.dbo.finviz
    WHERE anl_datum = (SELECT MAX(anl_datum) FROM trading.dbo.finviz)
      AND ticker IS NOT NULL;
  `);

  const rows = result.recordset.filter(r => isRealStock(r));

  let stocks = rows.map(row => {
    const rs = calculateRsScoreWoNFromDb(row);

    return {
      ticker: row.ticker,
      name: row.company,
      sector: row.sector,
      industry: row.industry,
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

  stocks.sort((a, b) => b.score - a.score);
  stocks.forEach((s, i) => s.rankWonDb = i + 1);

  return stocks;
}

module.exports = { buildStockRsSnapshot };
