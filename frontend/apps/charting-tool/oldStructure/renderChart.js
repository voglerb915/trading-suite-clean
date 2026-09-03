import { renderSectorFilterBar } from '../../lab/render/renderSectorFilter.js';
import { initCharts, renderActiveCharts } from './chartLogic.js';
import GlobalState from '../../../shared/state/globalState.js';
import { stylePill } from '../js/renderer/rrgPillsRenderer.js';

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

// --- Score & Perf Pillen: Exakte Zustandssynchronisation ---
    const btnScore = document.getElementById('btn-toggle-score');
    const btnPerf = document.getElementById('btn-toggle-perf');

    function setButtonState(btn, active) {
        if (active) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        // stylePill erhält hier direkt den gewünschten Ziel-Zustand (true/false)
        stylePill(btn, active);
    }

    if (btnScore && btnPerf) {
        // Standard-Zustand beim Start erzwingen: Score AN, Perf AUS
        setButtonState(btnScore, true);
        setButtonState(btnPerf, false);

        btnScore.addEventListener('click', () => {
            const willBeActive = !btnScore.classList.contains('active');
            setButtonState(btnScore, willBeActive);
            renderActiveCharts();
        });

        btnPerf.addEventListener('click', () => {
            const willBeActive = !btnPerf.classList.contains('active');
            setButtonState(btnPerf, willBeActive);
            renderActiveCharts();
        });
    }
});