5. breadthIndicators.js – aus Rohdaten Indikatoren bauen
js
import { ema, cumulative } from './mathUtils.js';
import { BREADTH_CONFIG } from './breadthConfig.js';

export function buildZweigBreadth(rawSeries) {
  const ratios = rawSeries.map(d =>
    d.advancers + d.decliners === 0
      ? 0
      : d.advancers / (d.advancers + d.decliners)
  );

  const ema10 = ema(ratios, BREADTH_CONFIG.emaPeriods.zweig);

  return rawSeries.map((d, i) => ({
    date: d.date,
    zweigBreadth: ema10[i],
  }));
}

export function buildMcClellan(rawSeries) {
  const netAdv = rawSeries.map(
    d => d.advancers - d.decliners
  );

  const fast = ema(netAdv, BREADTH_CONFIG.emaPeriods.mcClellanFast);
  const slow = ema(netAdv, BREADTH_CONFIG.emaPeriods.mcClellanSlow);

  const osc = fast.map((v, i) => v - slow[i]);
  const summation = cumulative(osc);

  return rawSeries.map((d, i) => ({
    date: d.date,
    mcClellanOsc: osc[i],
    mcClellanSum: summation[i],
  }));
}

export function buildMaBreadth(rawSeries) {
  return rawSeries.map(d => ({
    date: d.date,
    ma50Breadth: d.total ? d.aboveMa50 / d.total : 0,
    ma200Breadth: d.total ? d.aboveMa200 / d.total : 0,
  }));
}