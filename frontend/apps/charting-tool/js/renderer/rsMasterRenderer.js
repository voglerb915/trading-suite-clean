let combinedChartInstance = null;

/**
 * Rendert den Combined RS Chart (Score + Perf)
 * @param {Array} scoreData - Array von Score-Objekten (industry, score)
 * @param {Array} perfValues - Array von Performance-Werten
 * @param {Object} metrics - { score: boolean, perf: boolean }
 * @param {Function} onIndustryClick - Callback für Industry-Klick
 * @param {String|null} sectorName - dynamischer Sektorname für den Titel
 */
export function renderCombinedChart(scoreData, perfValues, metrics, onIndustryClick, sectorName = null) {
    const canvas = document.getElementById('rsMasterChart');
    if (!canvas) return;

    const wrapper = canvas.parentElement;

    const dynamicHeight = Math.max(600, scoreData.length * 25);
    canvas.style.height = `${dynamicHeight}px`;
    wrapper.style.overflowY = 'auto';

    const ctx = canvas.getContext('2d');

    const labels = scoreData.map(d => d.industry);
    const scores = scoreData.map(d => d.score);

    // ⭐ Dynamischer Titel
    const chartTitle = sectorName
        ? `Industry RS Score & Performance – ${sectorName}`
        : `Industry RS Score & Performance`;

    // ⭐ --- Dynamische Min/Max-Berechnung für Score & Perf ---
    const minScore = Math.min(0, ...scores);
    const maxScore = Math.max(1, ...scores);

    const minPerf = Math.min(0, ...perfValues);
    const maxPerf = Math.max(1, ...perfValues);

    // Verhältnis negativer/positiver Bereich
    const negScoreSpan = Math.abs(minScore);
    const posScoreSpan = maxScore;
    const scoreRatio = negScoreSpan / (negScoreSpan + posScoreSpan);

    const negPerfSpan = Math.abs(minPerf);
    const posPerfSpan = maxPerf;
    const perfRatio = negPerfSpan / (negPerfSpan + posPerfSpan);

    // Gemeinsame Ratio für perfekte Null-Linien-Synchronisation
    const targetRatio = Math.max(scoreRatio, perfRatio, 0.15);

    // Dynamisch angepasste Achsen
    const adjustedMinScore = -(targetRatio * posScoreSpan) / (1 - targetRatio);
    const adjustedMaxScore = maxScore * 1.05;

    const adjustedMinPerf = -(targetRatio * posPerfSpan) / (1 - targetRatio);
    const adjustedMaxPerf = maxPerf * 1.05;

    // ⭐ Gemeinsame Achse für perfekte Deckungsgleichheit
    const globalMin = Math.min(adjustedMinScore, adjustedMinPerf);
    const globalMax = Math.max(adjustedMaxScore, adjustedMaxPerf);

    // Alte Instanz zerstören
    if (combinedChartInstance) combinedChartInstance.destroy();

    combinedChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                metrics.perf && {
                    type: 'bar',
                    label: 'Performance 3M (%)',
                    data: perfValues.map((val, index) => ({
                        x: [0, val],
                        y: index
                    })),
                    backgroundColor: perfValues.map(p => p >= 0 ? '#10b981' : '#ef4444'),
                    barThickness: 4,
                    xAxisID: 'x2',
                    order: 1
                },
                metrics.score && {
                    type: 'bar',
                    label: 'RS Score',
                    data: scores,
                    backgroundColor: '#f59e0b',
                    borderRadius: 4,
                    xAxisID: 'x',
                    order: 2
                }
            ].filter(Boolean)
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,

            // ⭐ Canvas-Titel
            plugins: {
                title: {
                    display: true,
                    text: chartTitle,
                    color: '#fff',
                    font: { size: 16 }
                }
            },

            onClick: (event, elements, chart) => {
                const activeElements = chart.getElementsAtEventForMode(
                    event,
                    'nearest',
                    { intersect: true },
                    true
                );

                if (activeElements.length > 0 && typeof onIndustryClick === 'function') {
                    const index = activeElements[0].index;
                    const industryName = chart.data.labels[index];
                    onIndustryClick(industryName);
                }
            },

            // ⭐ Perfekt synchronisierte Achsen
            scales: {
                x: {
                    position: 'bottom',
                    display: metrics.score,
                    min: globalMin,
                    max: globalMax,
                    title: { display: true, text: 'RS Score (Balanced Zero Line)', color: '#888' },
                    ticks: { color: '#888' },
                    grid: {
                        color: ctx => ctx.tick.value === 0 ? '#888' : '#222'
                    }
                },
                x2: {
                    position: 'top',
                    display: metrics.perf,
                    min: globalMin,
                    max: globalMax,
                    title: { display: true, text: 'Performance 3M (%) [Exakt synchronisiert]', color: '#888' },
                    ticks: {
                        color: '#888',
                        callback: val => val.toFixed(0) + '%'
                    },
                    grid: {
                        drawOnChartArea: true,
                        color: ctx => ctx.tick.value === 0 ? '#888' : '#222'
                    }
                },
                y: {
                    position: 'left',
                    ticks: {
                        color: '#888',
                        font: { size: 11 },
                        align: 'center'
                    },
                    grid: { color: '#222' }
                }
            }
        }
    });
}
