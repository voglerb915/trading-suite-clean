const { sql, config } = require('../../db/connection');
const { calculateRsScoreWoNFromDb } = require('./rsScoreWoNFromDb');

async function buildSectorRsSnapshot() {
  await sql.connect(config);

  // ⭐ Neu: neuestes Datum NUR für Sectors holen
  const result = await sql.query(`
    SELECT 
      [name],
      [perf_week],
      [perf_month],
      [perf_quart],
      [perf_half],
      [perf_year],
      [change],
      [anl_datum]
    FROM trading.dbo.finviz_groups
    WHERE [group] = 'sector'
      AND anl_datum = (
        SELECT MAX(anl_datum)
        FROM trading.dbo.finviz_groups
        WHERE [group] = 'sector'
      )
  `);

  let sectors = result.recordset.map(row => {
    const rs = calculateRsScoreWoNFromDb(row);

    return {
      name: row.name,
      score: rs.score,

      rankWonDb: 0,

      // ⭐ diffD neu
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
          change: row.change
        }
      ],

      anl_datum: row.anl_datum
    };
  });

  // Ranking
  sectors.sort((a, b) => b.score - a.score);
  sectors.forEach((sec, i) => sec.rankWonDb = i + 1);

  return sectors;
}

module.exports = { buildSectorRsSnapshot };
