import { filterSignals } from "./signalsFilterlogic.js";
import { renderSignalsItem } from "./sub-renderers/renderSignalsItem.js";
import { renderSignalsPills } from "./sub-renderers/renderSignalsPills.js";
import { renderSignalsButtons } from "./sub-renderers/renderSignalsButtons.js";

export function renderSignalsList(stocks, state, container) {
    if (!container) return;

    // ⭐ State für globale Event-Listener verfügbar machen
    window.currentDashboardState = state;

    // 1. Liste leeren
    container.innerHTML = "";

    // 2. Filter anwenden
    const filtered = filterSignals(stocks, state);

    // ⭐ Nach globalRank sortieren (aufsteigend: 1, 2, 3... - fehlende Ränge ans Ende)
    filtered.sort((a, b) => {
        const rankA = a.globalRank ?? a.rsRank ?? a.rank ?? Infinity;
        const rankB = b.globalRank ?? b.rsRank ?? b.rank ?? Infinity;
        return rankA - rankB;
    });

    // ⭐ Gefilterte Signale im State speichern (analog zu stocks)
    if (state) {
        state.lastProcessedSignals = filtered;
    }

    // 3. Pills rendern (mit der Anzahl der gefilterten Treffer)
    const count = Array.isArray(filtered) ? filtered.length : 0;
    renderSignalsPills(count, state);

    // 4. Buttons rendern
    renderSignalsButtons(state);

    // 5. Falls keine Treffer
    if (!filtered.length) {
        container.innerHTML = `
            <div style="padding: 12px; color: #666;">
                Keine Signale verfügbar
            </div>
        `;
        return;
    }

    // 6. UL erzeugen
    const listUl = document.createElement("ul");
    listUl.className = "stock-list-ul";
    listUl.style.padding = "0";
    listUl.style.margin = "0";

    // 7. Rows rendern (Die Indizes `idx` spiegeln jetzt direkt den neuen sortierten Rang wider)
    filtered.forEach((item, idx) => {
        const li = renderSignalsItem(item, idx, state);
        listUl.appendChild(li);
    });

    // 8. Liste einfügen
    container.appendChild(listUl);
}