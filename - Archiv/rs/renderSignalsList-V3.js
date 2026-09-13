import { filterSignals } from "./signalsFilterLogic.js";
import { renderSignalsItem } from "./sub-renderers/renderSignalsItem.js";
import { renderSignalsPills } from "./sub-renderers/renderSignalsPills.js";
import { renderSignalsButtons } from "./sub-renderers/renderSignalsButtons.js";

export function renderSignalsList(stocks, state, container) {
    if (!container) return;

    // ⭐ State für globale Event-Listener verfügbar machen
    window.currentDashboardState = state;

    console.log("🟦 RENDER → stocks LENGTH:", stocks?.length);
    console.log("🟦 RENDER → stocks SAMPLE:", stocks?.[0]);

    console.log("🟧 RENDER → dashboardState.signals LENGTH:", state?.signals?.length);
    console.log("🟧 RENDER → dashboardState.signals SAMPLE:", state?.signals?.[0]);

    // 1. Liste leeren
    container.innerHTML = "";

    // 2. Filter anwenden
    const filtered = filterSignals(stocks, state);

    console.log("🟥 RENDER → filtered LENGTH:", filtered.length);
    console.log("🟥 RENDER → filtered SAMPLE:", filtered[0]);

    // ⭐ Nach globalRank sortieren
    filtered.sort((a, b) => {
        const rankA = a.globalRank ?? a.rsRank ?? a.rank ?? Infinity;
        const rankB = b.globalRank ?? b.rsRank ?? b.rank ?? Infinity;
        return rankA - rankB;
    });

    // ⭐ Gefilterte Signale im State speichern
    if (state) {
        state.lastProcessedSignals = filtered;
    }

    // 3. Pills rendern
    const count = Array.isArray(filtered) ? filtered.length : 0;
    renderSignalsPills(count, state);

    // 4. Buttons rendern
    renderSignalsButtons(state);

    // 5. Falls keine Treffer
    if (!filtered.length) {
        console.log("⚠️ RENDER → Keine Treffer nach filterSignals()");
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

    // 7. Rows rendern
    filtered.forEach((item, idx) => {
        const li = renderSignalsItem(item, idx, state);
        listUl.appendChild(li);
    });

    // 8. Liste einfügen
    container.appendChild(listUl);
}
