import { handleIndustrySelection } from './rightSideLogic.js';

let combinedChartInstance = null;

export function renderCombinedChart(scoreData, perfValues, metrics = { score: true, perf: false }) {
    const canvas = document.getElementById('combinedIndustryChart');
    if (!canvas) return;
    const wrapper = canvas.parentElement;

    const dynamicHeight = Math.max(600, scoreData.length * 25);
    canvas.style.height = `${dynamicHeight}px`;
    wrapper.style.overflowY = 'auto';

    const ctx = canvas.getContext('2d');
    const labels = scoreData.map(d => d.industry);
    const scores = scoreData.map(d => d.score);

    const minScore = Math.min(0, ...scores);
    const maxScore = Math.max(1, ...scores);
    const minPerf = Math.min(0, ...perfValues);
    const maxPerf = Math.max(1, ...perfValues);

    const negScoreSpan = Math.abs(minScore);
    const posScoreSpan = maxScore;
    const scoreRatio = negScoreSpan / (negScoreSpan + posScoreSpan);

    const negPerfSpan = Math.abs(minPerf);
    const posPerfSpan = maxPerf;
    const perfRatio = negPerfSpan / (negPerfSpan + posPerfSpan);

    const targetRatio = Math.max(scoreRatio, perfRatio, 0.15);

    const adjustedMinScore = - (targetRatio * posScoreSpan) / (1 - targetRatio);
    const adjustedMaxScore = maxScore * 1.05;

    const adjustedMinPerf = - (targetRatio * posPerfSpan) / (1 - targetRatio);
    const adjustedMaxPerf = maxPerf * 1.05;

    if (combinedChartInstance) combinedChartInstance.destroy();

    let datasets = [];

    if (metrics.perf) {
        datasets.push({
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
        });
    }

    if (metrics.score) {
        datasets.push({
            type: 'bar',
            label: 'RS Score',
            data: scores,
            backgroundColor: '#f59e0b',
            borderRadius: 4,
            xAxisID: 'x',
            order: 2
        });
    }

    combinedChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements, chart) => {
                const activeElements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const industryName = chart.data.labels[index];
                    
                    // 👉 Hier übergeben wir explicitly `true` als zweiten Parameter!
                    handleIndustrySelection(industryName, true); 
                }
            },
            scales: {
                x: {
                    position: 'bottom',
                    display: metrics.score,
                    min: adjustedMinScore,
                    max: adjustedMaxScore,
                    title: { display: true, text: 'RS Score (Ausgeglichene 0-Linie)', color: '#888' },
                    ticks: { color: '#888' },
                    grid: { 
                        color: function(context) {
                            return context.tick.value === 0 ? '#888' : '#222';
                        }
                    }
                },
                x2: {
                    position: 'top',
                    display: metrics.perf,
                    min: adjustedMinPerf,
                    max: adjustedMaxPerf,
                    title: { display: true, text: 'Performance 3M (%) [Exakt synchronisiert]', color: '#888' },
                    ticks: { 
                        color: '#888',
                        callback: function(value) { return value.toFixed(0) + '%'; }
                    },
                    grid: { 
                        drawOnChartArea: true, 
                        color: function(context) {
                            return context.tick.value === 0 ? '#888' : '#222';
                        }
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