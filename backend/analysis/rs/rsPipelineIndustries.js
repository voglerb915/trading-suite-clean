// analysis/rs/rsPipelineIndustries.js
const { sql, config } = require('../../db/connection');
const { calculateRsScoreWoNFromDb } = require('./rsScoreWoNFromDb');

async function buildIndustryRsSnapshot() {
  await sql.connect(config);

  // ⭐ 1) Sector-Mapping laden (aus finviz_stocks)
  const stocks = await sql.query(`
    SELECT DISTINCT sector, industry
    FROM trading.dbo.finviz
    WHERE anl_datum = (SELECT MAX(anl_datum) FROM trading.dbo.finviz)
  `);

  const sectorMap = {};
  stocks.recordset.forEach(s => {
    sectorMap[s.industry] = s.sector;
  });

  // ⭐ 2) Neueste Industry-Daten holen
  const result = await sql.query(`
    WITH latest AS (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY name 
                ORDER BY anl_datum DESC
            ) AS rn
        FROM trading.dbo.finviz_groups
        WHERE [group] = 'industry'
    )
    SELECT 
      [name],
      [perf_week],
      [perf_month],
      [perf_quart],
      [perf_half],
      [perf_year],
      [change],
      [anl_datum]
    FROM latest
    WHERE rn = 1
  `);

  // ⭐ 3) Snapshot-Objekte erzeugen (kompatibel zum alten Dashboard)
  let industries = result.recordset.map(row => {
    const rs = calculateRsScoreWoNFromDb(row);

    return {
      name: row.name,
      sector: sectorMap[row.name] || "Unknown",   // ⭐ WICHTIG für UI
      score: rs.score,

      // wird später gesetzt
      rankWonDb: 0,
      diffD: 0,
      diffW: 0,
      diffM: 0,
      diffQ: 0,                                    // ⭐ UI erwartet diffQ

      perf_week: row.perf_week,
      perf_month: row.perf_month,
      perf_quart: row.perf_quart,
      perf_half: row.perf_half,
      perf_year: row.perf_year,

      // ⭐ UI erwartet data[] mit change
      data: [
        {
          date: row.anl_datum.toISOString().slice(0, 10),
          change: row.change
        }
      ],

      anl_datum: row.anl_datum
    };
  });

  // ⭐ 4) Ranking nach RS-Score
  industries.sort((a, b) => b.score - a.score);
  industries.forEach((ind, i) => ind.rankWonDb = i + 1);
  
  return industries;
}

module.exports = { buildIndustryRsSnapshot };
