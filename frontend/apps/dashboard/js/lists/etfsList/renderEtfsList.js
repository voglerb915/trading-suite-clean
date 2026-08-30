import { renderEtfsItem } from './sub-renderers/renderEtfsItem.js';

export function renderEtfsList(etfs, state, container) {
    const listUl = container || document.getElementById('tools-tab-content'); 
    if (!listUl) return;

    const processedEtfs = etfs; 

    if (!processedEtfs || processedEtfs.length === 0) {
        listUl.innerHTML = `
            <li class="etf-item empty" style="padding: 20px; text-align: center; color: #666;">
                Keine ETF-Daten verfügbar.
            </li>
        `;
        return;
    }

    const pillContainer = document.getElementById('tools-pill-container');
    if (pillContainer) {
        pillContainer.innerHTML = `<span class="pill pill-all active">${processedEtfs.length} ETFs</span>`;
    }

    const html = processedEtfs.map((item, idx) => {
        return renderEtfsItem(item, idx, state);
    }).join('');

    // Geändert von stock-list auf etf-list
    listUl.innerHTML = `<ul class="etf-list" style="list-style: none; padding: 0; margin: 0;">${html}</ul>`;
}