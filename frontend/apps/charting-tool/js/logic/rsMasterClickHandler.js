// js/rs/logic/rsMasterClickHandler.js

import { handleIndustrySelection } from './rsRightSideLogic.js';

/**
 * Wird vom CombinedChart-Renderer aufgerufen,
 * wenn der Nutzer eine Industrie anklickt.
 *
 * @param {string} industryName
 */
export function onIndustryClick(industryName) {
    if (!industryName) return;

    // 👉 Weiterleitung an die Right-Side-Logik
    handleIndustrySelection(industryName, true);

    // 👉 Optional: Dashboard informieren (falls eingebettet)
    try {
        window.parent.postMessage({
            type: "REQUEST",
            action: "SELECT_INDUSTRY",
            payload: { industryName }
        }, "*");
    } catch (err) {
        console.warn("Dashboard PostMessage konnte nicht gesendet werden:", err);
    }
}
