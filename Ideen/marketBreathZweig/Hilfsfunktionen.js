Hilfsfunktionen für EMA & Summation
js
export function ema(values, period) {
  const k = 2 / (period + 1);
  let emaArr = [];
  let prev;

  values.forEach((v, i) => {
    if (i === 0) {
      prev = v;
      emaArr.push(v);
    } else {
      const e = v * k + prev * (1 - k);
      emaArr.push(e);
      prev = e;
    }
  });

  return emaArr;
}

export function cumulative(values) {
  let sum = 0;
  return values.map(v => (sum += v));
}