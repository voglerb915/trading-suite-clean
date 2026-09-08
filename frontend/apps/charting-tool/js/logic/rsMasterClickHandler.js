import { handleIndustrySelection } from './rsRightSideLogic.js';
import GlobalState from "@shared/state/globalState.js";
import { getSectorNameFromTicker } from './rsSectorMapping.js'; // Falls vorhanden, oder direkt den Ticker/Namen

export function onIndustryClick(industryName) {
    if (!industryName) return;

    // 👉 Weiterleitung an die Right-Side-Logik
    handleIndustrySelection(industryName, true);

    // Aktuellen Sektor aus dem GlobalState holen
    const activeSectors = GlobalState.get("activeSectors");
    const currentSectorTicker = activeSectors ? Array.from(activeSectors)[0] : null;

    // 👉 Dashboard informieren mit Sektor + Industrie
    try {
        window.parent.postMessage({
            type: "REQUEST",
            action: "SELECT_INDUSTRY",
            payload: { 
                sectorName: currentSectorTicker, // <-- Sektor mitschicken
                industryName 
            }
        }, "*");
    } catch (err) {
        console.warn("Dashboard PostMessage konnte nicht gesendet werden:", err);
    }
}