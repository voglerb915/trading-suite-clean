7. Orchestrierung – deine „Engine“-Funktion
js
import { getBreadthRawForDate } from './breadthRaw.js';
import { buildZweigBreadth, buildMcClellan, buildMaBreadth } from './breadthIndicators.js';
import { detectBreadthDivergenceTop } from './breadthSignals.js';

export async function runBreadthEngine(dates, indexSeries) {
  const rawSeries = [];

  for (const date of dates) {
    rawSeries.push(await getBreadthRawForDate(date));
  }

  const zweig = buildZweigBreadth(rawSeries);
  const mc = buildMcClellan(rawSeries);
  const ma = buildMaBreadth(rawSeries);

  // Beispiel: MA200-Breadth-Divergenz gegen Index
  const signals = detectBreadthDivergenceTop(indexSeries, ma, 'ma200Breadth');

  return {
    raw: rawSeries,
    zweig,
    mc,
    ma,
    signals,
  };
}