// ---------------------------------------------------------
// sectorStats.js
// Berechnet alle Kennzahlen für den rechten Säulenblock
// in jedem SectorTile.
// ---------------------------------------------------------

import { getHeatmapClass, calculatePercent } from "../../shared/logic/heatmapLogic.js";

/**
 * Berechnet die Statistik für einen Sektor.
 * industries: Array aller Industrie-Objekte dieses Sektors
 * top29Count: absolute Anzahl der Top-29 Industrien (Week D0)
 */

export function calculateSectorStats(industries, top29Count) {

    const industryCount = industries.length;

    // -----------------------------
    // 1. Prozentwert der Top-29
    // -----------------------------
    const top29Percent = calculatePercent(top29Count, industryCount);

    // -----------------------------
    // 2. Ranks für D0 extrahieren
    // -----------------------------
    const ranks = industries.map(ind => ind.week_rank_series[0]);

    // -----------------------------
    // 3. Min / Max / Avg Rank
    // -----------------------------
    const minRank = Math.min(...ranks);
    const maxRank = Math.max(...ranks);
    const avgRank = ranks.reduce((a, b) => a + b, 0) / industryCount;

    // -----------------------------
    // 4. Normalisierung auf 1–144
    // -----------------------------
    const minNorm = minRank / 144;
    const maxNorm = maxRank / 144;
    const avgNorm = avgRank / 144;

    // -----------------------------
    // 5. Säulenfarbe (Heatmap)
    // -----------------------------
    const heatmapClass = getHeatmapClass(top29Count, industryCount);

    // -----------------------------
    // 6. Output-Struktur
    // -----------------------------
    return {
        industryCount,
        top29Percent,

        minRank,
        maxRank,
        avgRank,

        minNorm,
        maxNorm,
        avgNorm,

        heatmapClass,
        top29Count   // ← WICHTIG!
    };
}
