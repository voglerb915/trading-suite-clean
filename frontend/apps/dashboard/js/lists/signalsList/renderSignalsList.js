import { filterSignals } from "./signalsFilterLogic.js";
import { renderSignalsItem } from "./sub-renderers/renderSignalsItem.js";
import { renderSignalsPills } from "./sub-renderers/renderSignalsPills.js";
import { renderSignalsButtons } from "./sub-renderers/renderSignalsButtons.js";

export function renderSignalsList(signals, state, container) {
    if (!container) return;




    container.innerHTML = "";

    const filtered = filterSignals(signals, state);



    filtered.sort((a, b) => {
        const rankA = a.globalRank ?? a.rsRank ?? a.rank ?? Infinity;
        const rankB = b.globalRank ?? b.rsRank ?? b.rank ?? Infinity;
        return rankA - rankB;
    });

    state.lastProcessedSignals = filtered;

    renderSignalsPills(filtered.length, state);
    renderSignalsButtons(state);

    if (!filtered.length) {
        container.innerHTML = `
            <div style="padding: 12px; color: #666;">
                Keine Signale verfügbar
            </div>
        `;
        return;
    }

    const listUl = document.createElement("ul");
    listUl.className = "stock-list-ul";

    filtered.forEach((item, idx) => {
        const li = renderSignalsItem(item, idx, state);
        listUl.appendChild(li);
    });

    container.appendChild(listUl);
}
