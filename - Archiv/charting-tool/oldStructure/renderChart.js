import { renderSectorFilterBar } from '../../lab/render/renderSectorFilter.js';
import { initCharts, renderActiveCharts } from './chartLogic.js';
import GlobalState from '../../../shared/state/globalState.js';
import { renderCombinedChart } from '../oldStructure/chartRenderer.js';


document.addEventListener("DOMContentLoaded", async () => {

    if (!GlobalState.get("activeSectors")) {
        GlobalState.set("activeSectors", new Set([
            "XLK","XLF","XLE","XLU","XLI","XLY","XLP","XLV","XLB","XLRE","XLC"
        ]));
    }

    renderSectorFilterBar("sector-filter-container-view", () => {
        renderActiveCharts();
    });

    await initCharts();

    // --- Score & Perf Pillen ---
    const btnScore = document.getElementById('btn-toggle-score');
    const btnPerf = document.getElementById('btn-toggle-perf');

    function setButtonState(btn, active) {
        btn.classList.toggle('active', active);
    }

    if (btnScore && btnPerf) {

        // Standard-Zustand beim Start
        setButtonState(btnScore, true);
        setButtonState(btnPerf, false);

btnScore.addEventListener('click', () => {
    const willBeActive = !btnScore.classList.contains('active');
    setButtonState(btnScore, willBeActive);

    const metrics = {
        score: btnScore.classList.contains('active'),
        perf: btnPerf.classList.contains('active')
    };

    const scoreData = GlobalState.get("rawScores");
    const perfValues = GlobalState.get("industryPerf");

    renderCombinedChart(scoreData, perfValues, metrics);
});



btnPerf.addEventListener('click', () => {
    const willBeActive = !btnPerf.classList.contains('active');
    setButtonState(btnPerf, willBeActive);

    const metrics = {
        score: btnScore.classList.contains('active'),
        perf: btnPerf.classList.contains('active')
    };

    const scoreData = GlobalState.get("rawScores");
    const perfValues = GlobalState.get("industryPerf");

    renderCombinedChart(scoreData, perfValues, metrics);
});


    }
});
