const fs = require('fs');
const path = require('path');
const { buildStockRsSnapshot } = require('./rsPipelineStocks');

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function loadHistoryFiles() {
  const historyDir = path.join(__dirname, '..', '..', 'json-history');
  if (!fs.existsSync(historyDir)) return [];

  return fs.readdirSync(historyDir)
    .filter(f => f.endsWith('_stocks.json'))
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
  snapshot.forEach((s, idx) => {
    map[s.ticker] = idx + 1;
  });
  return map;
}

function computeDiffs(current, historyFiles) {
  const today = normalizeDate(current[0].anl_datum);

  const steps = {
    diffD: 1,
    diffW: 5,
    diffM: 21,
    diffQ: 63
  };

  const result = current.map(s => ({
    ...s,
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

    result.forEach(s => {
      const prevRank = prevRankMap[s.ticker];
      if (!prevRank) return;

      const currentRank = s.rankWonDb;
      s[key] = prevRank - currentRank;
    });
  }

  return result;
}

async function writeStocksJson() {
  let stocks = await buildStockRsSnapshot();
  if (!stocks || stocks.length === 0) return stocks;

  const latestDate = normalizeDate(stocks[0].anl_datum);
  stocks = stocks.filter(s => normalizeDate(s.anl_datum) === latestDate);

  const snapshotFile = path.join(__dirname, '..', '..', 'json', 'rs_stocks.json');
  const historyDir = path.join(__dirname, '..', '..', 'json-history');
  if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

  const historyFile = path.join(historyDir, `${latestDate}_stocks.json`);

  // Roh-Snapshot speichern
  fs.writeFileSync(historyFile, JSON.stringify(stocks, null, 2));

  // Diffs berechnen
  const historyFiles = loadHistoryFiles();
  const stocksWithDiffs = computeDiffs(stocks, historyFiles);

  // ---------------------------------------------------------
  // marketScores: Insert Stocks into DB
  // ---------------------------------------------------------
  const { sql, config } = require('../../db/connection');
  const pool = await sql.connect(config);
  // 1. DELETE: Entfernt nur die Industrie-Einträge von heute
  await pool.request()
      .input('datum', sql.DateTime, new Date(latestDate))
      .input('type', sql.VarChar, 'stock')
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

  for (const item of stocksWithDiffs) {
      await pool.request()
          .input('type', sql.VarChar, 'stock')
          .input('name', sql.VarChar, item.ticker)          // wichtig: Stocks haben Ticker
          .input('score', sql.Float, item.score)
          .input('rank_db', sql.Int, item.rankWonDb)
          .input('diffD', sql.Int, item.diffD)
          .input('diffW', sql.Int, item.diffW)
          .input('diffM', sql.Int, item.diffM)
          .input('diffQ', sql.Int, item.diffQ)
          .input('anl_datum', sql.DateTime, item.anl_datum)
          .query(insertSql);
  }

  console.log(`📥 marketScores: ${stocksWithDiffs.length} Stock‑Einträge gespeichert`);

  // Snapshot + History schreiben
  fs.writeFileSync(snapshotFile, JSON.stringify(stocksWithDiffs, null, 2));
  fs.writeFileSync(historyFile, JSON.stringify(stocksWithDiffs, null, 2));

  console.log(`✅ RS Stocks Snapshot + History geschrieben (${stocks.length} Einträge, Datum ${latestDate})`);

  return stocksWithDiffs;
}

module.exports = { writeStocksJson };
