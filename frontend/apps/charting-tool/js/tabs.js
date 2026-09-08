// tabs.js – Router und Message-Hub
import GlobalState from "@shared/state/globalState.js";

const tabs = document.querySelectorAll('.charting-tab');
const panels = document.querySelectorAll('.chart-panel');

const chartingState = {
    sector: null,
    industry: null,
    activeTab: null
};

function switchTab(targetId) {
    chartingState.activeTab = targetId;

    tabs.forEach(t => {
        if (t.dataset.tab === targetId) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    panels.forEach(panel => {
        if (panel.dataset.panel === targetId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    // Nur den aktiven Tab beim Klick synchronisieren falls nötig
    dispatchToActiveOrchestrator();
}

// Nur für den aktiven Tab beim Tab-Wechsel
async function dispatchToActiveOrchestrator() {
    const tab = chartingState.activeTab;
    if (tab === '1') {
        try {
            const rsModule = await import("./rsMain.js");
            if (rsModule) {
                if (chartingState.industry && typeof rsModule.updateRsIndustryFilterFromExternal === 'function') {
                    await rsModule.updateRsIndustryFilterFromExternal(chartingState.sector, chartingState.industry);
                } else if (chartingState.sector && typeof rsModule.updateRsFilterFromExternal === 'function') {
                    await rsModule.updateRsFilterFromExternal(chartingState.sector);
                }
            }
        } catch (err) { console.error("Fehler Tab 1:", err); }
    } else if (tab === '2') {
        try {
            const rrgModule = await import("./rrgMain.js");
            if (rrgModule && typeof rrgModule.updateRrgFilterFromExternal === 'function' && chartingState.sector) {
                await rrgModule.updateRrgFilterFromExternal(chartingState.sector);
            }
        } catch (err) { console.error("Fehler Tab 2:", err); }
    }
}

// NEU: Aktualisiert ALLE Module im Hintergrund bei externen Signalen
async function updateAllModules(sectorName, industryName = null) {
    // 1. Tab 1 (RS) aktualisieren
    try {
        const rsModule = await import("./rsMain.js");
        if (rsModule) {
            if (industryName && typeof rsModule.updateRsIndustryFilterFromExternal === 'function') {
                await rsModule.updateRsIndustryFilterFromExternal(sectorName, industryName);
            } else if (sectorName && typeof rsModule.updateRsFilterFromExternal === 'function') {
                await rsModule.updateRsFilterFromExternal(sectorName);
            }
        }
    } catch (err) {
        console.error("Fehler beim Hintergrund-Update von Tab 1 (RS):", err);
    }

    // 2. Tab 2 (RRG) im Hintergrund aktualisieren
    try {
        const rrgModule = await import("./rrgMain.js");
        if (rrgModule && typeof rrgModule.updateRrgFilterFromExternal === 'function' && sectorName) {
            await rrgModule.updateRrgFilterFromExternal(sectorName);
        }
    } catch (err) {
        console.error("Fehler beim Hintergrund-Update von Tab 2 (RRG):", err);
    }
}

// Globaler postMessage Listener
window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg || msg.type !== "RESPONSE") return;

    if (msg.action === "SET_SECTOR") {
        chartingState.sector = msg.payload?.sectorName;
        chartingState.industry = null;
        console.log("🎯 Router: Sektor-Signal empfangen:", chartingState.sector);
        updateAllModules(chartingState.sector, null);
    }

    if (msg.action === "SET_INDUSTRY") {
        chartingState.sector = msg.payload?.sectorName;
        chartingState.industry = msg.payload?.industryName;
        console.log("🎯 Router: Industrie-Signal empfangen:", chartingState.industry);
        updateAllModules(chartingState.sector, chartingState.industry);
    }
});

// Klick-Events für Tabs
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
    });
});

// Start-Initialisierung
const currentActiveTab = document.querySelector('.charting-tab.active') || tabs[0];
if (currentActiveTab) {
    switchTab(currentActiveTab.dataset.tab);
}