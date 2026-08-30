Hier holst du pro Tag die Basisgrößen aus SQL (oder API).

js
import sql from 'mssql';
import { BREADTH_CONFIG } from './breadthConfig.js';

export async function getBreadthRawForDate(date) {
  const { universeFilter } = BREADTH_CONFIG;

  const baseFilter = `
    country = '${universeFilter.country}'
    AND etf = 0
  `;

  const adv = await sql.query(`
    SELECT COUNT(*) AS c
    FROM finviz
    WHERE ${baseFilter}
      AND perf_day > 0
      AND trading_date = '${date}'
  `);

  const dec = await sql.query(`
    SELECT COUNT(*) AS c
    FROM finviz
    WHERE ${baseFilter}
      AND perf_day < 0
      AND trading_date = '${date}'
  `);

  const ma50 = await sql.query(`
    SELECT COUNT(*) AS c
    FROM finviz
    WHERE ${baseFilter}
      AND price > ma50
      AND trading_date = '${date}'
  `);

  const ma200 = await sql.query(`
    SELECT COUNT(*) AS c
    FROM finviz
    WHERE ${baseFilter}
      AND price > ma200
      AND trading_date = '${date}'
  `);

  const total = await sql.query(`
    SELECT COUNT(*) AS c
    FROM finviz
    WHERE ${baseFilter}
      AND trading_date = '${date}'
  `);

  return {
    date,
    advancers: adv.recordset[0].c,
    decliners: dec.recordset[0].c,
    total: total.recordset[0].c,
    aboveMa50: ma50.recordset[0].c,
    aboveMa200: ma200.recordset[0].c,
  };
}
Optional: New Highs/Lows, Up/Down Volume analog.