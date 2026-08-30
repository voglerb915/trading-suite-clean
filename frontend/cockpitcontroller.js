import { controllerState } from './controller-modules/state.js';
import * as api from './controller-modules/apiService.js';
import * as processor from './controller-modules/strategyProcessor.js';
import { sendDashboardInit } from './controller-modules/uiDispatcher.js';
import { initMessageRouter } from './controller-modules/messageRouter.js';
import { computeVolumeExtract } from "./shared/utils/volumeExtract.js";

let isDataReady = false;

console.log("CockpitController (Modular) gestartet.");

// 1. Message Router initialisieren (nur für initiale Requests des Iframes wie INIT)
initMessageRouter(
    handleFilterStocks,
    handleFilterSignals,
    handleStockDetails,
    handleList,
    handleFocusView
);

// 2. Initialisierung starten
controllerInit();

async function controllerInit() {
    console.log("BOOT: Sequenzieller Start...");
    
    try {
        // ==========================================================
        // 1. Basis-Marktdaten laden
        // ==========================================================
        console.log("BOOT Phase 1: Lade Basis-Marktdaten...");
        const base = await api.fetchBaseMarketData();
        const validTickers = new Set(base.stocks.map(s => s.ticker));

        // State per Array-Mutation aktualisieren (Referenzen für Module stabil halten)
        controllerState.baseStocks.length = 0;
        controllerState.baseStocks.push(...base.stocks);

        controllerState.stocks.length = 0;
        controllerState.stocks.push(...base.stocks);

        controllerState.sectors.length = 0;
        controllerState.sectors.push(...base.sectors);

        controllerState.industries.length = 0;
        controllerState.industries.push(...base.industries);

        controllerState.etfs.length = 0;
        controllerState.etfs.push(...base.etfs);

        // ==========================================================
        // 2. Signals & Sparks laden
        // ==========================================================
        console.log("BOOT Phase 2: Lade Signals & Sparks...");
        const [midSignalsDataRaw, sparkSignalsDataRaw] = await Promise.all([
            fetch("/api/analysis/midsignals")
                .then(r => r.ok ? r.json() : { success: false, data: [], counts: {} })
                .catch(() => ({ success: false, data: [], counts: {} })),
            fetch("/api/sparklinesignals")
                .then(r => r.ok ? r.json() : ({ stocks: {}, sectors: {}, industries: {} }))
                .catch(() => ({ stocks: {}, sectors: {}, industries: {} }))
        ]);

        let sparkSignalsData = sparkSignalsDataRaw;
        if (Array.isArray(sparkSignalsData)) {
            sparkSignalsData = {
                stocks: Object.fromEntries(sparkSignalsData.map(s => [s.ticker, s])),
                sectors: {},
                industries: {}
            };
        }

        controllerState.sparkSignals = sparkSignalsData;
        controllerState.midSignals = midSignalsDataRaw;

        await new Promise(resolve => setTimeout(resolve, 100));

        // ==========================================================
        // 3) Strategy-Daten laden & anreichern (Original-Logik)
        // ==========================================================
        const strategyNames = ["stage3topping", "insideday52w"];
        const strategyItemsMap = {};

        for (const name of strategyNames) {
            try {
                // Falls du eine Hilfsfunktion loadStrategyStocks hast, nutze sie. 
                // Alternativ direkt der Fetch wie im alten Code:
                const res = await fetch(`/api/strategy/${name}`);
                const json = await res.json();
                strategyItemsMap[name] = json.signals || json.data || [];
            } catch (err) {
                console.warn("Strategy Load Error:", name, err);
                strategyItemsMap[name] = [];
            }
        }

        controllerState.strategyItems = strategyItemsMap;

        // Reader-Daten holen
        let stage3ReaderData = [];
        try {
            const res = await fetch("/api/strategy/stage3topping");
            const json = await res.json();
            stage3ReaderData = json.signals || json.data || [];
        } catch (err) {
            console.warn("Stage3 Reader Fetch Error:", err);
        }

        let insideDayReaderData = [];
        try {
            const res = await fetch("/api/strategy/insideday52w");
            const json = await res.json();
            insideDayReaderData = json.data || json.signals || [];
        } catch (err) {
            console.warn("InsideDay Reader Fetch Error:", err);
        }

        // Stage 3 anreichern
        try {
            const baseItems = controllerState.strategyItems["stage3topping"] || [];
            const enriched = baseItems.map(stock => {
                const base = 
                    controllerState.baseStocks.find(s => s.ticker === stock.ticker) ||
                    controllerState.etfs.find(e => e.ticker === stock.ticker) ||
                    {};
                const r = stage3ReaderData.find(x => x.ticker === stock.ticker);
                if (!r) return { ...base, ...stock };

                return {
                    ...base,
                    ...stock,
                    stateActive: r.stateActive,
                    daysAbove: r.daysAbove,
                    slopeVal: r.slopeVal,
                    indRank: r.indRank,
                    smaDist: r.smaDist,
                    triggerDate: r.triggerDate,
                    totalScore: r.totalScore,
                    score_stateActive: r.score_stateActive ?? 0,
                    score_age: r.score_age ?? 0,
                    score_slope: r.score_slope ?? 0,
                    score_indRank: r.score_indRank ?? 0,
                    score_smaDist: r.score_smaDist ?? 0,
                    sector: base.sector || stock.sector || "—",
                    industry: base.industry || stock.industry || "—"
                };
            });
            controllerState.strategyItems["stage3topping"] = enriched;
        } catch (err) {
            console.warn("Stage3 Reader Merge Error:", err);
        }

        // InsideDay52w anreichern
        try {
            const baseItems = controllerState.strategyItems["insideday52w"]?.length > 0 
                ? controllerState.strategyItems["insideday52w"] 
                : insideDayReaderData;

            const enriched = baseItems.map(stock => {
                const base = 
                    controllerState.baseStocks.find(s => s.ticker === stock.ticker) ||
                    controllerState.etfs.find(e => e.ticker === stock.ticker) ||
                    {};
                const r = insideDayReaderData.find(x => x.ticker === stock.ticker);
                if (!r) return { ...base, ...stock };

                return {
                    ...base,
                    ...stock,
                    tightness: r.s2_tightness,
                    volRatio: r.s2_vol_ratio,
                    isGreenInt: r.s2_is_green_int,
                    highVortag: r.s2_high_vortag,
                    lowVortag: r.s2_low_vortag,
                    setupStatus: r.s2_setup_status,
                    anchorHigh: r.s2_anchor_high,
                    anchorLow: r.s2_anchor_low,
                    strategyValue: r.s2_tightness,
                    value: r.s2_tightness,
                    sector: base.sector || stock.sector || "—",
                    industry: base.industry || stock.industry || "—"
                };
            });
            controllerState.strategyItems["insideday52w"] = enriched;
        } catch (err) {
            console.warn("InsideDay Reader Merge Error:", err);
        }

        // Prozessor-Anreicherung mit den direkt geladenen Daten aufrufen
        processor.enrichStrategyData(stage3ReaderData, insideDayReaderData);

        // ==========================================================
        // 4. Volume Extract & Finalisierung
        // ==========================================================
        controllerState.volumeExtract = computeVolumeExtract(base.stocks);

        console.log("BOOT: Alle Daten bereit. Sende an Iframe...", {
            stocks: controllerState.stocks.length,
            sparkStocks: Object.keys(controllerState.sparkSignals?.stocks || {}).length,
            stage3Count: controllerState.strategyItems.stage3topping.length,
            insideDayCount: controllerState.strategyItems.insideday52w.length
        });
        
        // Finalen State einmalig an das Dashboard senden -> Das Dashboard übernimmt ab hier alles selbst!
        sendDashboardInit(controllerState);

        isDataReady = true;
console.log("BOOT: Controller ist nun vollständig bereit.");

    } catch (error) {
        console.error("Kritischer Fehler im Boot-Prozess:", error);
    }
}

// ======================================================
// Handler für Iframe-Kommunikation
// ======================================================

function handleFilterSignals(payload) {}

async function handleFilterStocks(payload) {
    // Falls das Dashboard ein INIT anfragt, schicken wir den fertigen State
    if (payload && payload.isInit) { // oder je nachdem, wie dein MessageRouter das INIT erkennt
        sendDashboardInit(controllerState);
    }
}

function handleStockDetails(payload) {
    const ticker = payload?.ticker;
    if (!ticker) return;
    const stock = controllerState.stocks.find(s => s.ticker === ticker);
    if (!stock) return;
    window.postMessage({
        type: "RESPONSE",
        action: "STOCK_DETAILS",
        payload: {
            ticker,
            stock,
            spark: controllerState.sparkSignals?.stocks?.[ticker] || null,
            mid: controllerState.midSignals?.stocks?.[ticker] || null
        }
    }, "*");
}

function handleList(payload) {
    const { listType } = payload || {};
    let data = [];
    switch(listType) {
        case "stocks": data = controllerState.stocks; break;
        case "sectors": data = controllerState.sectors; break;
        case "industries": data = controllerState.industries; break;
        case "etfs": data = controllerState.etfs; break;
        default: return;
    }
    window.postMessage({ type: "RESPONSE", action: "LIST_DATA", payload: { listType, data } }, "*");
}

function handleFocusView(payload) {
    const { ticker } = payload || {};
    const stock = controllerState.stocks.find(s => s.ticker === ticker);
    if (!stock) return;
    window.postMessage({
        type: "RESPONSE",
        action: "FOCUS_VIEW_DATA",
        payload: { ticker, stock, spark: controllerState.sparkSignals?.stocks?.[ticker] || null, mid: controllerState.midSignals?.stocks?.[ticker] || null }
    }, "*");
}