6. breadthSignals.js – einfache Top-/Bottom‑Logik
js
export function detectBreadthDivergenceTop(indexSeries, breadthSeries, key = 'ma200Breadth') {
  // indexSeries: [{date, close}]
  // breadthSeries: [{date, ma200Breadth, ...}]
  // sehr einfache Divergenz-Logik als Startpunkt

  const signals = [];

  for (let i = 2; i < indexSeries.length; i++) {
    const p0 = indexSeries[i - 2];
    const p1 = indexSeries[i - 1];
    const p2 = indexSeries[i];

    const b0 = breadthSeries[i - 2];
    const b1 = breadthSeries[i - 1];
    const b2 = breadthSeries[i];

    const indexHigherHigh =
      p2.close > p1.close && p1.close > p0.close;

    const breadthLowerHigh =
      b2[key] < b1[key] && b1[key] < b0[key];

    if (indexHigherHigh && breadthLowerHigh) {
      signals.push({
        date: p2.date,
        type: 'breadth_divergence_top',
        indexClose: p2.close,
        breadth: b2[key],
      });
    }
  }

  return signals;
}