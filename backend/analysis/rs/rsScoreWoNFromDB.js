function calculateRsScoreWoNFromDb(periods) {
  if (!periods || typeof periods !== 'object') {
    return { score: 0, components: null }
  }

  const perfWeek  = parseFloat(periods.perf_week)  || 0
  const perf1M    = parseFloat(periods.perf_month) || 0
  const perf3M    = parseFloat(periods.perf_quart) || 0
  const perf6M    = parseFloat(periods.perf_half)  || 0
  const perf12M   = parseFloat(periods.perf_year)  || 0

  const scoreRaw =
    0.40 * perf3M +
    0.20 * perf1M +
    0.20 * perf6M +
    0.20 * perf12M

  const score = Number.isFinite(scoreRaw) ? scoreRaw : 0

  return {
    score,
    components: { perfWeek, perf1M, perf3M, perf6M, perf12M }
  }
}

module.exports = { calculateRsScoreWoNFromDb }
