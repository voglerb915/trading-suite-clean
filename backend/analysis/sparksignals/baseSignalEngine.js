/**
 * baseSignalEngine.js
 * --------------------
 * Zentrale Sparkline-Signal-Logik für Industries, Sectors, Stocks.
 * Keine Seiteneffekte, reine Analysefunktionen.
 *
 * Signal-Definition (fachlich):
 * - ENTRY: letzter Wert vor dem aktuellen ist das Minimum der letzten N Werte
 *          UND der aktuelle Wert ist größer als dieser Minimum-Wert.
 * - EXIT:  letzter Wert vor dem aktuellen ist das Maximum der letzten N Werte
 *          UND der aktuelle Wert ist kleiner als dieser Maximum-Wert.
 */

/* ---------------------------------------------
   1. Daten-Vorbereitung
---------------------------------------------- */

function sliceLastN(series, n = 25) {
    if (!Array.isArray(series)) return [];
    return series.slice(-n);
}

function cleanSeries(series) {
    if (!Array.isArray(series)) return [];
    return series.filter(v => typeof v === "number" && !isNaN(v));
}

function isValidSeries(series, minLength = 5) {
    return Array.isArray(series) && series.length >= minLength;
}

/* ---------------------------------------------
   2. Extremwert-Erkennung
---------------------------------------------- */

function getMax(series) {
    return Math.max(...series);
}

function getMin(series) {
    return Math.min(...series);
}

/* ---------------------------------------------
   3. (Optional) Farblogik für Visualisierung
   – kann im Frontend gespiegelt werden,
     ist aber NICHT Grundlage der Signal-Logik.
---------------------------------------------- */

function isMax(value, max) {
    return value === max && value > 0;
}

function isMin(value, min) {
    return value === min && value < 0;
}

function getColorForValue(v, max, min) {
    if (isMax(v, max)) return "green";   // Hochpunkt
    if (isMin(v, min)) return "red";     // Tiefpunkt
    if (v > 0) return "blue";            // positive Werte
    return "orange";                     // negative Werte
}

/* ---------------------------------------------
   4. Signal-Erzeugung (fachlich korrekt)
   - basiert auf WERTEN, nicht Farben
---------------------------------------------- */
function getSparklineSignal(series) {
    if (!Array.isArray(series) || series.length < 3) return null;

    // 1) Nur gültige Zahlen
    const cleaned = series.filter(v => typeof v === "number" && !isNaN(v));
    if (cleaned.length < 3) return null;

    // 2) Orientierung korrigieren:
    // Deine Daten: [neu, ..., alt]
    // Wir drehen: [alt, ..., neu]
    const normalized = cleaned.slice().reverse();

    // 3) Letzte 25 Werte (bezogen auf ZEIT, also die jüngsten)
    const last25 = normalized.slice(-25);
    if (last25.length < 3) return null;

    // 4) prev/curr = die beiden letzten ZEITPUNKTE (neueste Werte)
    const prev = last25[last25.length - 2];
    const curr = last25[last25.length - 1];

    const min = Math.min(...last25);
    const max = Math.max(...last25);

    // ENTRY: Tiefpunkt → steigender Wert
    if (prev === min && curr > prev) {
        return "entry";
    }

    // EXIT: Hochpunkt → fallender Wert
    if (prev === max && curr < prev) {
        return "exit";
    }

    return null;
}


/* ---------------------------------------------
   5. Exports
---------------------------------------------- */

module.exports = {
    sliceLastN,
    cleanSeries,
    isValidSeries,
    getMax,
    getMin,
    isMax,
    isMin,
    getColorForValue,
    getSparklineSignal
};
