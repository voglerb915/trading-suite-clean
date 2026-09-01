import GlobalState from "../../shared/state/globalState.js";
import { getVolumeMetrics } from "../../shared/api/volume.js";
import { renderVolumeTable } from "./render/renderVolumeTable.js";
import { renderIndexes } from "./render/renderIndexes.js";
import { renderVolumeExtract } from "./render/renderVolumeExtract.js";
import { renderSectorQuadrant } from './render/renderSectorMomentum.js';
import { renderIndustryQuadrant } from './render/renderIndustryMomentum.js';
import { renderStockQuadrant } from './render/renderStockMomentum.js';
import { renderSectorFilterBar } from './render/renderSectorFilter.js';
import { renderQuadrantFilterBar } from './render/renderQuadrantFilter.js';
import { renderIndexFilterBar } from './render/renderIndexFilter.js'; 
import { initFalseBo } from './js/mainFalseBo.js'; // 🚀 Neuer Orchestrator Import

async function loadIndexHistory() {
    const res = await fetch("http://localhost:4000/api/data/indexhistory");
    return await res.json();
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("LAB: Start...");

    // 1) Volume & Indexes laden...
    const volume = await getVolumeMetrics();
    const filtered = volume.filter(v => v.turnover >= 10_000_000);
    GlobalState.set("volumeData", filtered);
    renderVolumeTable(filtered);
    renderVolumeExtract(filtered);

    const indexData = await loadIndexHistory();
    renderIndexes("lab-index-base", indexData);

    // 🚀 1.5) False Breakout Strategie initialisieren
    initFalseBo('col-3');

    // 2) Filter-Leisten initialisieren
    renderSectorFilterBar("sector-filter-bar", () => {
        renderIndustryQuadrant();
    });

    renderQuadrantFilterBar("quadrant-filter-bar", () => {
        renderIndustryQuadrant();
    });

    renderIndexFilterBar("index-filter-bar", () => {
        renderStockQuadrant();
    });

    // 3) Tabs steuern
    const buttons = document.querySelectorAll(".tab-bar .tab");
    const contents = document.querySelectorAll(".tab-content");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.tab;

            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            contents.forEach(c => {
                c.style.display = (c.id === `tab-${target}`) ? "block" : "none";
            });

            if (target === "charts") {
                renderSectorQuadrant();
                renderIndustryQuadrant();
                renderStockQuadrant(); // <--- Beim Tab-Wechsel direkt mitladen
            }
        });
    });
});

window.addEventListener("message", (event) => {
    const msg = event.data;
    if (!msg) return;

    // 1. Bestehendes Update
    if (msg.type === "UPDATE_STOCKS") {
        const stocks = msg.stocks;
        if (!Array.isArray(stocks)) return;
        GlobalState.set("volumeData", stocks);
        renderVolumeTable(stocks);
        renderVolumeExtract(stocks);
    }

    // 👉 2. NEU: Sektor-Signal vom Controller abfangen
    if (msg.action === "SET_SECTOR") {
        const sectorName = msg.payload?.sectorName;
        console.log("🎯 LAB hat Sektor-Signal erhalten:", sectorName);

        if (!sectorName) return;

        // Mapping von Sektornamen auf die im Lab verwendeten Ticker (XL_SECTORS)
        const sectorTickerMap = {
            "Technology": "XLK",
            "Financial": "XLF",
            "Financials": "XLF",
            "Energy": "XLE",
            "Utilities": "XLU",
            "Industrials": "XLI",
            "Consumer Cyclical": "XLY",
            "Consumer Discretionary": "XLY",
            "Consumer Defensive": "XLP",
            "Consumer Staples": "XLP",
            "Healthcare": "XLV",
            "Health Care": "XLV",
            "Basic Materials": "XLB",
            "Materials": "XLB",
            "Real Estate": "XLRE",
            "Communication Services": "XLC"
        };

        const ticker = sectorTickerMap[sectorName];
        if (ticker) {
            // GlobalState mit genau diesem 1 Sektor aktualisieren
            GlobalState.set("activeSectors", new Set([ticker]));

            // UI-Komponenten im Lab aktualisieren, die darauf lauschen
            renderSectorFilterBar("sector-filter-bar", () => {
                renderIndustryQuadrant();
            });
            renderSectorQuadrant();
            renderIndustryQuadrant();
            
            console.log(`✅ Lab-Filter erfolgreich auf Sektor [${sectorName}] (${ticker}) gesetzt.`);
        }
    }
});