// analysis/rs/writeIndustriesJson.js
const fs = require('fs');
const path = require('path');
const { buildIndustryRsSnapshot } = require('./rsPipelineIndustries');

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function loadHistoryFiles() {
  const historyDir = path.join(__dirname, '..', '..', 'json-history');
  if (!fs.existsSync(historyDir)) return [];

  return fs.readdirSync(historyDir)
    .filter(f => f.endsWith('_industries.json'))
    .sort()
    .map(f => ({
      date: f.slice(0, 10),
      file: path.join(historyDir, f)
    }));
}

function loadSnapshotByDate(date, historyFiles) {
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
  snapshot.forEach((ind, idx) => {
    map[ind.name] = idx + 1;
  });
  return map;
}

function computeDiffs(current, historyFiles) {
  const today = normalizeDate(current[0].anl_datum);

  // ⭐ Industries haben diffD zusätzlich
  const steps = {
    diffD: 1,
    diffW: 5,
    diffM: 21,
    diffQ: 63
  };

  const result = current.map(ind => ({
    ...ind,
    diffD: null,
    diffW: null,
    diffM: null,
    diffQ: null
  }));

  const allDates = historyFiles.map(h => h.date);
  const todayIndex = allDates.indexOf(today);

  if (todayIndex === -1) return result;

  for (const [key, offset] of Object.entries(steps)) {
    const targetIndex = todayIndex - offset;
    if (targetIndex < 0) continue;

    const targetDate = allDates[targetIndex];
    const snapshot = loadSnapshotByDate(targetDate, historyFiles);
    if (!snapshot) continue;

    const prevRankMap = buildRankMap(snapshot);

    result.forEach(ind => {
      const prevRank = prevRankMap[ind.name];
      if (!prevRank) return;

      const currentRank = ind.rankWonDb;
      ind[key] = prevRank - currentRank;
    });
  }

  return result;
}

async function writeIndustriesJson() {
  let industries = await buildIndustryRsSnapshot();
  if (!industries || industries.length === 0) return industries;

  const latestDate = normalizeDate(industries[0].anl_datum);
  industries = industries.filter(ind => normalizeDate(ind.anl_datum) === latestDate);

  const snapshotFile = path.join(__dirname, '..', '..', 'json', 'rs_industries.json');
  const historyDir = path.join(__dirname, '..', '..', 'json-history');
  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

  const historyFile = path.join(historyDir, `${latestDate}_industries.json`);

  // 1) Roh-History speichern
  fs.writeFileSync(historyFile, JSON.stringify(industries, null, 2));

  // 2) History laden + Diffs berechnen
  const historyFiles = loadHistoryFiles();
  const industriesWithDiffs = computeDiffs(industries, historyFiles);


  // ---------------------------------------------------------
  // marketScores: Insert Industries into DB
  // ---------------------------------------------------------
  const { sql, config } = require('../../db/connection');
  const pool = await sql.connect(config);

  // 1. DELETE: Entfernt nur die Industrie-Einträge von heute 
  await pool.request()
      .input('datum', sql.DateTime, new Date(latestDate))
      .input('type', sql.VarChar, 'industry') 
      .query(`DELETE FROM trading.dbo.marketScores 
              WHERE type = @type 
              AND CAST(anl_datum AS DATE) = CAST(@datum AS DATE)`);

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

  for (const item of industriesWithDiffs) {
      await pool.request()
          .input('type', sql.VarChar, 'industry') // Hier ist es korrekt
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

  console.log(`📥 marketScores: ${industriesWithDiffs.length} Industry‑Einträge gespeichert`);

  // 3) Snapshot MIT Diffs
  fs.writeFileSync(snapshotFile, JSON.stringify(industriesWithDiffs, null, 2));

  // 4) History MIT Diffs überschreiben
  fs.writeFileSync(historyFile, JSON.stringify(industriesWithDiffs, null, 2));

  console.log(`✅ RS Industries Snapshot + History geschrieben (${industries.length} Einträge, Datum ${latestDate})`);

  return industriesWithDiffs;
}

module.exports = { writeIndustriesJson };
