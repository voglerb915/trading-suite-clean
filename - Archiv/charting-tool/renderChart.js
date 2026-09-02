// Korrigierter Pfad relativ zu charting-tool/renderChart.js zum Lab-Ordner:
import { renderSectorFilterBar } from '../../../../lab/render/renderSectorFilter.js';
import { initCharts, renderActiveCharts } from './chartLogic.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Sektor-Filterleiste rendern
    renderSectorFilterBar("sector-filter-container", () => {
        renderActiveCharts();
    });

    // Daten laden und Charts initialisieren
    await initCharts();
});