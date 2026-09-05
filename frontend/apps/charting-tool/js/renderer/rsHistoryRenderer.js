import { getActiveMetrics } from '../logic/rsLogic.js';

let sectorChartInstance = null;
let industryChartInstance = null;

export function updateRightCharts(
    sectorScoreHistory,
    sectorPerfHistory,
    industryScoreHistory,
    industryPerfHistory,
    industryName,
    industrySmaHistory,
    sectorName
) {
    const metrics = getActiveMetrics();

    // Canvas holen
    const sectorCanvas = document.getElementById('rsSectorHistory');
    const industryCanvas = document.getElementById('rsIndustryHistory');

    // Wenn DOM noch nicht bereit → später erneut rendern
    if (!sectorCanvas || !industryCanvas) {
        setTimeout(() => {
            updateRightCharts(
                sectorScoreHistory,
                sectorPerfHistory,
                industryScoreHistory,
                industryPerfHistory,
                industryName,
                industrySmaHistory,
                sectorName
            );
        }, 50);
        return;
    }

    // -----------------------------
    // ⭐ SECTOR HISTORY CHART
    // -----------------------------
    if (sectorChartInstance) sectorChartInstance.destroy();

    const sectorLabels = sectorScoreHistory.map(d => d.anl_datum);
    const sectorDatasets = [];

    if (metrics.score) {
        sectorDatasets.push({
            label: 'RS Score',
            data: sectorScoreHistory.map(d => d.score),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.25)',
            tension: 0.2,
            fill: true,
            yAxisID: 'yScore'
        });
    }

    if (metrics.perf) {
        sectorDatasets.push({
            label: 'Performance 3M (%)',
            data: sectorPerfHistory.map(d => d.performance),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.25)',
            tension: 0.2,
            fill: true,
            yAxisID: 'yPerf'
        });
    }

    sectorChartInstance = new Chart(sectorCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: sectorLabels,
            datasets: sectorDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Sector History – ${sectorName}`,
                    color: '#fff',
                    font: { size: 14 }
                },
                legend: { labels: { color: '#fff' } }
            },
            scales: {
                x: {
                    ticks: { color: '#ccc' },
                    grid: { color: '#333' }
                },
                yScore: {
                    position: 'left',
                    ticks: { color: '#f59e0b' },
                    grid: { color: '#333' }
                },
                yPerf: {
                    position: 'right',
                    ticks: {
                        color: '#10b981',
                        callback: v => v + '%'
                    },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });

    // -----------------------------
    // ⭐ INDUSTRY HISTORY CHART
    // -----------------------------
    if (industryChartInstance) industryChartInstance.destroy();

    const industryLabels = industryScoreHistory.map(d => d.anl_datum);
    const industryDatasets = [];

    if (metrics.score) {
        industryDatasets.push({
            label: 'RS Score',
            data: industryScoreHistory.map(d => d.score),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.25)',
            tension: 0.2,
            fill: true,
            yAxisID: 'yScore'
        });
    }

    if (metrics.perf) {
        industryDatasets.push({
            label: 'Performance 3M (%)',
            data: industryPerfHistory.map(d => d.performance),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.25)',
            tension: 0.2,
            fill: true,
            yAxisID: 'yPerf'
        });
    }

    // SMA21 bleibt links
    industryDatasets.push({
        label: 'SMA21',
        data: industrySmaHistory.map(d => d.sma21),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.15)',
        tension: 0.2,
        fill: false,
        yAxisID: 'yScore'
    });

    industryChartInstance = new Chart(industryCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: industryLabels,
            datasets: industryDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Industry History – ${industryName}`,
                    color: '#fff',
                    font: { size: 14 }
                },
                legend: { labels: { color: '#fff' } }
            },
            scales: {
                x: {
                    ticks: { color: '#ccc' },
                    grid: { color: '#333' }
                },
                yScore: {
                    position: 'left',
                    ticks: { color: '#f59e0b' },
                    grid: { color: '#333' }
                },
                yPerf: {
                    position: 'right',
                    ticks: {
                        color: '#10b981',
                        callback: v => v + '%'
                    },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}
