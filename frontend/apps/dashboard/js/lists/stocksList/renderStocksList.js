import { filterAndSortStocks } from "./stocksFilterLogic.js";
import { renderStockPills } from "./sub-renderers/renderStockPills.js";
import { renderStockButtons } from "./sub-renderers/renderStockButtons.js";
import { renderStockItem } from "./sub-renderers/renderStockItem.js";

export function renderStocksList(stocks, state) {
    const listUl = document.getElementById('stocks-list');
    if (!listUl) return;

    // 1. 🛠️ FILTER & SORTIERUNG AUSLAGERN
    const processedStocks = filterAndSortStocks(stocks, state);

    // Speichere die aktuell gerenderten/gefilterten Stocks im State ab:
    if (state) {
        state.lastProcessedStocks = processedStocks;
    }

    if (!processedStocks || processedStocks.length === 0) {
        listUl.innerHTML = `
            <li class="stock-item empty">
                Keine Treffer für Strategy '${state?.strategy || "none"}'
            </li>
        `;
        return;
    }

    // 2. 🟢 PILLEN IM HEADER AKTUALISIEREN
    renderStockPills(processedStocks.length, state);

    // 3. 🟢 EXPORT-BUTTONS IM HEADER INITIALISIEREN
    renderStockButtons(state);

    // Aktive Industrie aus dem State ermitteln (für den Score-Vergleich)
    const activeIndustry = state?.industry 
        ? (state.industries || []).find(ind => ind.industry === state.industry) 
        : null;

    // 4. 📋 LISTEN-ELEMENTE RENDERN
    const html = processedStocks.map((item, idx) => {
        return renderStockItem(item, idx, state, activeIndustry);
    }).join('');

    listUl.innerHTML = html;
}