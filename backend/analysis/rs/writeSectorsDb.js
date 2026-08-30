// analysis/rs/writeSectorsDb.js

const { buildSectorRsSnapshot } = require('./rsPipelineSectors');
const { sql, config } = require('../../db/connection');
const { writeSectorsSparkSignals } = require('../sparksignals/writeSectorsSparkSignals');

// Hilfsfunktion wie im Original
function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------
// 1️⃣ RS Snapshot erzeugen
// ---------------------------------------------------------
async function writeSectorsDb() {

  let sectors = await buildSectorRsSnapshot();
  if (!sectors || sectors.length === 0) return sectors;

  const latestDate = normalizeDate(sectors[0].anl_datum);
  sectors = sectors.filter(sec => normalizeDate(sec.anl_datum) === latestDate);

  // ---------------------------------------------------------
  // 2️⃣ Diffs berechnen (aus deiner Originaldatei übernommen)
  // ---------------------------------------------------------
  const fs = require('fs');
  const path = require('path');

  const historyDir = path.join(__dirname, '..', '..', 'json-history');
  const historyFiles = fs.existsSync(historyDir)
    ? fs.readdirSync(historyDir)
        .filter(f => f.endsWith('_sectors.json'))
        .sort()
        .map(f => ({
          date: f.slice(0, 10),
          file: path.join(historyDir, f)
        }))
    : [];

  function loadSnapshotByDate(date) {
    const entry = historyFiles.find(h => h.date === date);
    if (!entry) return null;
    try {
      return JSON.parse(fs.readFileSync(entry.file, 'utf8'));
    } catch {
      return null;
    }
  }

  function buildRankMap(snapshot) {
    const map = {};
    snapshot.forEach((sec, idx) => {
      map[sec.name] = idx + 1;
    });
    return map;
  }

  const steps = { diffD: 1, diffW: 5, diffM: 21, diffQ: 63 };
  const allDates = historyFiles.map(h => h.date);
  const todayIndex = allDates.indexOf(latestDate);

  const sectorsWithDiffs = sectors.map(sec => ({
    ...sec,
    diffD: null,
    diffW: null,
    diffM: null,
    diffQ: null
  }));

  if (todayIndex !== -1) {
    for (const [key, offset] of Object.entries(steps)) {
      const targetIndex = todayIndex - offset;
      if (targetIndex < 0) continue;

      const targetDate = allDates[targetIndex];
      const snapshot = loadSnapshotByDate(targetDate);
      if (!snapshot) continue;

      const prevRankMap = buildRankMap(snapshot);

      sectorsWithDiffs.forEach(sec => {
        const prevRank = prevRankMap[sec.name];
        if (!prevRank) return;
        sec[key] = prevRank - sec.rankWonDb;
      });
    }
  }

  // ---------------------------------------------------------
  // 3️⃣ RS-Daten in die Datenbank schreiben
  // ---------------------------------------------------------
  const pool = await sql.connect(config);

  await pool.request()
      .input('datum', sql.DateTime, new Date(latestDate))
      .input('type', sql.VarChar, 'sector')
      .query(`
          DELETE FROM trading.dbo.marketScores
          WHERE type = @type
          AND CAST(anl_datum AS DATE) = CAST(@datum AS DATE)
      `);

  const insertSql = `
      INSERT INTO trading.dbo.marketScores (
          type,
          name,
          score,
          rank_db,
          diffD,
          diffW,
          diffM,
          diffQ,
          anl_datum
      )
      VALUES (
          @type,
          @name,
          @score,
          @rank_db,
          @diffD,
          @diffW,
          @diffM,
          @diffQ,
          @anl_datum
      )
  `;

  for (const item of sectorsWithDiffs) {
      await pool.request()
          .input('type', sql.VarChar, 'sector')
          .input('name', sql.VarChar, item.name)
          .input('score', sql.Float, item.score)
          .input('rank_db', sql.Int, item.rankWonDb)
          .input('diffD', sql.Int, item.diffD)
          .input('diffW', sql.Int, item.diffW)
          .input('diffM', sql.Int, item.diffM)
          .input('diffQ', sql.Int, item.diffQ)
          .input('anl_datum', sql.DateTime, item.anl_datum)
          .query(insertSql);
  }

  console.log(`📥 marketScores: ${sectorsWithDiffs.length} Sector‑Einträge gespeichert (RS + Diffs)`);

  // ---------------------------------------------------------
  // 4️⃣ Spark-Signale ergänzen
  // ---------------------------------------------------------
  const sparkResult = await writeSectorsSparkSignals();

  console.log(`✨ Spark-Signale ergänzt:`, sparkResult);

  return {
    success: true,
    count: sectorsWithDiffs.length,
    spark: sparkResult
  };
}

module.exports = { writeSectorsDb };
