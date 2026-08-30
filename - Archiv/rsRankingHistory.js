// analysis/rs/rsRankingHistory.js
const fs = require('fs');
const path = require('path');

const historyFolder = path.join(__dirname, '..', '..', 'json-history');
const rankmapFolder = path.join(historyFolder, 'rankmaps');

/* ============================================================
   Optimierte Version: Rankmap-basiert
   ============================================================ */

function extractName(item) {
  if (typeof item.name === 'string' && item.name.trim() !== '') return item.name.trim();
  if (typeof item.industry === 'string' && item.industry.trim() !== '') return item.industry.trim();
  if (typeof item.sector === 'string' && item.sector.trim() !== '') return item.sector.trim();
  return 'UNKNOWN';
}

function loadLatestRankmap(type) {
  const suffix = type === 'sector'
    ? '_sectors_rankmap.json'
    : '_industries_rankmap.json';

  const files = fs.readdirSync(rankmapFolder)
    .filter(f => f.endsWith(suffix))
    .sort();

  if (files.length === 0) return null;

  const latest = files[files.length - 1];
  const fullPath = path.join(rankmapFolder, latest);

  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function applyRankmapDiffs(currentData, rankmap, type) {
  const steps = type === 'sector'
    ? { W: 5, M: 21, Q: 63 }
    : { D: 1, W: 5, M: 21 };

  return currentData.map((item, index) => {
    const name = extractName(item);
    const currentRank = index + 1;

    const diffs = {};

    for (const step of Object.keys(steps)) {
      const prevRank = rankmap?.[step]?.[name] ?? null;
      diffs[`diff${step}`] = prevRank ? prevRank - currentRank : null;
    }

    return { ...item, ...diffs };
  });
}

/* ============================================================
   Öffentliche API
   ============================================================ */

module.exports = {
  getRankingDiffs(currentData, type) {
    const rankmap = loadLatestRankmap(type);

    // Falls keine Rankmap existiert → Fallback: keine Deltas
    if (!rankmap) {
      console.warn("⚠️ Keine Rankmap gefunden – Deltas = null");
      return currentData.map(item => ({
        ...item,
        diffD: null,
        diffW: null,
        diffM: null,
        diffQ: null
      }));
    }

    return applyRankmapDiffs(currentData, rankmap, type);
  }
};
