/*----------------------------------
1. Globaler State
----------------------------------*/
let currentToolId = "cockpit"; // Start-Tool

// Globaler Cockpit-State
window.cockpitState = {
    stocks: [],
    sectors: [],
    industries: [],
    market: {},
    index: "all",

    sector: null,
    industry: null,
    ticker: null,
    referenceStock: null,

    breadcrumbs: "Alle Sektoren",
    strategy: "none"
};

// 🟢 DataLayer – zentrale Rohdaten
window.dataStore = {
    baseStocks: [],
    metrics: {},
    finviz: {},
    sectors: [],
    industries: [],
    etfs: [],
    signals: [],
    strategyCache: new Map()
};

import { computeVolumeExtract } from "/shared/utils/volumeExtract.js";
console.log("HOST: cockpit.js geladen", performance.now());


if (window !== window.parent) {
    // Wir sind im Cockpit-iFrame
    window.parent.postMessage({ type: "COCKPIT_READY" }, "*");
}
if (window === window.parent) {
    // Wir sind im Host
    window.addEventListener("message", (event) => {
        if (event.data?.type === "COCKPIT_READY") {
            console.log("HOST: Cockpit meldet READY → sende Daten");
            sendCockpitData();
        }
    });
}

/*----------------------------------
2. Messaging: Cockpit-Daten senden
----------------------------------*/
function sendCockpitData() {
    console.log("COCKPIT → HOST: COCKPIT_DATA");

    window.parent.postMessage({
        type: "COCKPIT_DATA",
        state: window.cockpitState
    }, "*");
}

function sendFilteredStocksToDashboard(filteredStocks) {
    console.log("COCKPIT → HOST: UPDATE_STOCKS", filteredStocks.length);

    window.parent.postMessage({
        type: "UPDATE_STOCKS",
        stocks: filteredStocks
    }, "*");
}


/*----------------------------------
3. Navigation (Host-System)
----------------------------------*/
export function broadcastMessage(type, payload = {}) {
    const frames = document.querySelectorAll(".tool-iframe");

    frames.forEach(frame => {
        try {
            frame.contentWindow.postMessage(
                { type, ...payload },
                "*"
            );
        } catch (err) {
            console.warn("Broadcast-Fehler bei Frame:", frame.id, err);
        }
    });
}

/*----------------------------------
3b. showTool() – FINAL & STABIL
----------------------------------*/
function showTool(toolId) {
    console.log("Wechsle zu:", toolId);

    // 1) Alles deaktivieren
    document.querySelectorAll(".tool-iframe").forEach(el =>
        el.classList.remove("active")
    );

    // 2) Menü aktualisieren
    document.querySelectorAll("#main-nav a").forEach(link =>
        link.classList.remove("active-link")
    );
    const activeLink = document.querySelector(`#main-nav a[data-tool="${toolId}"]`);
    if (activeLink) activeLink.classList.add("active-link");

    // 3) iFrame aktivieren
    const targetIframe = document.getElementById(`iframe-${toolId}`);
    if (targetIframe) {
        targetIframe.classList.add("active");
        return;
    }

    console.warn("Tool nicht gefunden:", toolId);
}


/*----------------------------------
4. UI-Layer
----------------------------------*/
function updateHeaderSystemBadge(badge, text) {
    const el = document.getElementById("header-system-badge");
    if (!el) return;

    el.className = "";
    el.classList.add(`header-badge-${badge}`);
    el.textContent = text;
}


/*----------------------------------
5. Event-Handler
----------------------------------*/
document.addEventListener("click", (e) => {
    if (e.target.id === "header-system-badge") {
        showTool("control");
    }
});


/*----------------------------------
5a. Events vom Dashboard → Cockpit
----------------------------------*/
document.addEventListener("dashboard:strategyChange", async (e) => {
    const strategy = e.detail;
    window.cockpitState.strategy = strategy;

    await applyStrategy(strategy);

    // NEU
    window.cockpitState.volumeExtract = computeVolumeExtract(window.cockpitState.stocks);

    sendCockpitData();
});

document.addEventListener("dashboard:indexChange", (e) => {
    window.cockpitState.index = e.detail;

    applyFiltersAndSort();

    // NEU
    window.cockpitState.volumeExtract = computeVolumeExtract(window.cockpitState.stocks);

    sendCockpitData();
});

document.addEventListener("dashboard:searchChange", (e) => {
    window.cockpitState.search = e.detail;

    applyFiltersAndSort();

    window.cockpitState.volumeExtract = computeVolumeExtract(window.cockpitState.stocks);

    sendCockpitData();


});


/*----------------------------------
5b. Strategy-Handler
----------------------------------*/
async function loadStrategyStocks(strategyName) {
    if (window.dataStore.strategyCache.has(strategyName)) {
        return window.dataStore.strategyCache.get(strategyName);
    }

    const res = await fetch(`/api/strategy/${strategyName}`);
    const json = await res.json();

    window.dataStore.strategyCache.set(strategyName, json.data);
    return json.data;
}

function mergeStrategyWithDataLayer(strategyItems) {
    return strategyItems.map(item => {
        const base = window.dataStore.baseStocks.find(s => s.ticker === item.ticker)
                  || window.dataStore.etfs.find(e => e.ticker === item.ticker)
                  || {};

        const m = window.dataStore.metrics[item.ticker] || {};
        const f = window.dataStore.finviz[item.ticker] || {};

        return {
            ...base,
            ...m,
            ...f,
            ticker: item.ticker,
            sector: base.sector ?? f.sector ?? null,
            industry: base.industry ?? f.industry ?? null,
            strategyRank: item.strategyRank,
            strategyValue: item.strategyValue,
            // FIX: prevClose wiederherstellen
            prevClose: base.prevClose ?? m.prevClose ?? f.prevClose ?? null,
        };
    });
}

export async function applyStrategy(strategyName) {
    const isReset = !strategyName || strategyName === "none";

    if (isReset) {
        const stocks = window.dataStore.baseStocks;

        window.cockpitState.strategy = "none";
        window.cockpitState.stocks = stocks;
        window.cockpitState.volumeExtract = computeVolumeExtract(stocks);


        broadcastMessage("UPDATE_STOCKS", {
            stocks,
            strategy: "none",
            signals: window.dataStore.signals || []
        });

        sendCockpitData();
        return;
    }

    const strategyItems = await loadStrategyStocks(strategyName);
    const stocks = mergeStrategyWithDataLayer(strategyItems);

    window.cockpitState.strategy = strategyName;
    window.cockpitState.stocks = stocks;
    window.cockpitState.volumeExtract = computeVolumeExtract(stocks);


    broadcastMessage("UPDATE_STOCKS", {
        stocks,
        strategy: strategyName,
        signals: window.dataStore.signals || []
    });

    sendCockpitData();
}


/*----------------------------------
5c. Filter & Sortierung
----------------------------------*/
function filterStocks(state, stocks) {
    let result = [...stocks];

    // 1. FILTERUNG: Sector
    if (state.sector && state.sector !== "all") {
        result = result.filter(s => (s.sector || s.sector_name) === state.sector);
    }

    // 2. FILTERUNG: Industry
    if (state.industry) {
        result = result.filter(s => (s.industry || s.industry_name) === state.industry);
    }

    // 3. FILTERUNG: Index
    if (state.index && state.index !== "all") {
        result = result.filter(s => Array.isArray(s.index) && s.index.includes(state.index));
    }

    // 4. FILTERUNG: Volumen
    if (state.volFilterActive) {
        result = result.filter(s => {
            const vol = Number(s.volume || 0);
            const vma = Number(s.vma_20 || 0);
            return vma > 0 && vol > vma * 2;
        });
    }

    // 5. FILTERUNG: Ticker/Name
    if (state.search && state.search.length >= 1) {
        const q = state.search.toLowerCase();

        result = result.filter(s => {
            const ticker = s.ticker?.toLowerCase() || "";
            const name = s.name?.toLowerCase() || "";
            return ticker.includes(q) || name.includes(q);
        });

        // ⭐ 6. SORTIERUNG: Ticker beginnt mit Suchbegriff → oben
        result.sort((a, b) => {
            const q = state.search.toLowerCase();
            const aTicker = a.ticker.toLowerCase();
            const bTicker = b.ticker.toLowerCase();

            const aStarts = aTicker.startsWith(q);
            const bStarts = bTicker.startsWith(q);

            // Priorität: beginnt mit Suchbegriff
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            // Danach globalRank
            return a.globalRank - b.globalRank;
        });
    }

    return result;
}


function sortStocks(state, stocks) {
    const dir = state.sortDirection === "asc" ? 1 : -1;

    return [...stocks].sort((a, b) => {
        const valA = a.rank ?? a.strategyRank ?? 99999;
        const valB = b.rank ?? b.strategyRank ?? 99999;
        return (valA - valB) * dir;
    });
}

function applyFiltersAndSort() {
    console.log("SEARCH DEBUG STATE:", {
        search: window.cockpitState.search,
        stocksIn: window.cockpitState.stocksOriginal?.length
    });

    // ⭐ IMMER auf der ORIGINAL-LISTE filtern
    let filtered = filterStocks(window.cockpitState, window.cockpitState.stocksOriginal);

    console.log("AFTER filterStocks:", {
        filteredLen: filtered.length
    });

    // ⭐ Zusätzlicher Suchfilter (falls du ihn behalten willst)
    if (window.cockpitState.search && window.cockpitState.search.length > 0) {
        const s = window.cockpitState.search.toUpperCase();
        filtered = filtered.filter(stock =>
            stock.ticker?.toUpperCase().includes(s)
        );
    }

    console.log("AFTER SEARCH FILTER:", {
        search: window.cockpitState.search,
        filteredLen: filtered.length
    });

    const sorted = sortStocks(window.cockpitState, filtered);

    console.log("AFTER sortStocks:", {
        sortedLen: sorted.length
    });

    // ⭐ WICHTIG: Gefilterte Liste NICHT in stocks speichern!
    window.cockpitState.stocksFiltered = sorted;

    // ⭐ Volume Extract aktualisieren
    window.cockpitState.volumeExtract = computeVolumeExtract(sorted);

    // ⭐ Gefilterte Stocks an NEW-DASHBOARD senden
    sendFilteredStocksToDashboard(sorted);

    // ⭐ Komplettpaket an altes Dashboard (falls noch benötigt)
    sendCockpitData();
}


/*----------------------------------
6. Initialisierung
----------------------------------*/
async function loadBaseData() {
    const responses = await Promise.all([
        fetch("/api/market/stocks"),
        fetch("/api/market/sectors"),
        fetch("/api/market/industries"),
        fetch("/api/market/etfs"),
        fetch("/api/signals/mid-signal") // Pfad angepasst
    ]);

    const [stocks, sectors, industries, etfs, midSignalsData] = await Promise.all(
        responses.map(r => r.json())
    );

    // 🟢 Block 1: SparkSignals laden (NEU)
    let sparklineSignals = null;
    try {
        const sparkRes = await fetch("/api/sparksignals");
        const sparkJson = await sparkRes.json();

        if (sparkJson?.success) {
            sparklineSignals = sparkJson.sparkline;
            console.log("SparkSignals geladen:", sparklineSignals);
        } else {
            console.warn("SparkSignals: success=false", sparkJson);
        }
    } catch (err) {
        console.error("Fehler beim Laden der SparkSignals:", err);
    }

    // 1) DataStore füllen
    window.dataStore.baseStocks = stocks;
    window.dataStore.sectors = sectors;
    window.dataStore.industries = industries;
    window.dataStore.etfs = etfs;
    
    // Alt: window.dataStore.midSignals = midSignalsData;
    // Neu: Wandle das Array in ein Objekt um, das deine Filter-Logik braucht
    window.dataStore.midSignals = {
        stocks: midSignalsData.reduce((acc, signal) => {
            acc[signal.ticker] = signal;
            return acc;
        }, {})
    };

    // <--- HIER den log einfügen
    console.log("CHECK: DataStore wurde befüllt:", window.dataStore.midSignals.stocks);

    // 🟢 HIER IST DER SCHLÜSSEL:
    // Sende ein Event, dass die Daten bereit sind
    window.dispatchEvent(new CustomEvent("dataStoreReady"));

    window.dataStore.metrics = {};
    window.dataStore.finviz = {};

    // 🟢 Block 2: SparkSignals in den dataStore schreiben (NEU)
    window.dataStore.sparkSignals = {
        industries: sparklineSignals?.industries ?? {},
        sectors: sparklineSignals?.sectors ?? {},
        stocks: sparklineSignals?.stocks ?? {}
    };

    console.log("Mid-Signals im dataStore gespeichert:", window.dataStore.midSignals);
    console.log("SparkSignals im dataStore gespeichert:", window.dataStore.sparkSignals);

    // 2) CockpitState initialisieren
    window.cockpitState.stocks = stocks;
    window.cockpitState.stocksOriginal = stocks;
    window.cockpitState.volumeExtract = computeVolumeExtract(stocks);

    // 🟢 Block 3: SparkSignals in CockpitState integrieren (NEU)
    window.cockpitState.sparkSignals = {
        industries: sparklineSignals?.industries ?? {},
        sectors: sparklineSignals?.sectors ?? {},
        stocks: sparklineSignals?.stocks ?? {}
    };

    // 3) Daten ins Cockpit-iFrame senden
    sendCockpitData();
}

/*----------------------------------
7. DOMContentLoaded – FINAL
----------------------------------*/
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Cockpit Initialisierung gestartet...");

    // Device Info + Badge
    fetch("/api/device-info")
        .then(res => res.json())
        .then(data => {
            const logoDiv = document.querySelector(".logo");
            if (!logoDiv) return;

            const deviceInfo = document.createElement("div");
            deviceInfo.id = "device-status-info";
            deviceInfo.style.color = "white";
            deviceInfo.style.marginTop = "2px";
            deviceInfo.style.opacity = "0.7";
            deviceInfo.style.textTransform = "uppercase";

            const mode = data.isLaptop ? "Mobile Mode" : "Stationary";
            deviceInfo.innerHTML = `${data.deviceName} | ${mode} <span id="header-system-badge"></span>`;

            logoDiv.appendChild(deviceInfo);
            logoDiv.style.display = "flex";
            logoDiv.style.flexDirection = "column";
        });

    // Systemstatus Listener
    window.addEventListener("message", (event) => {
        if (event.data?.type === "system-status-update") {
            updateHeaderSystemBadge(event.data.badge, event.data.text);
        }
    });

    // Navigation aktivieren
    document.querySelectorAll("#main-nav a").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const tool = link.getAttribute("data-tool");
            if (tool) showTool(tool);
        });
    });

    // Basisdaten laden
    await loadBaseData();

    // Dashboard informieren (Der bessere Weg)
    const dbIframe = document.getElementById("iframe-new-dashboard");
    if (dbIframe && dbIframe.contentWindow) {
        const payload = {
            type: "COCKPIT_DATA_READY",
            stocks: window.dataStore.baseStocks,
            sectors: window.dataStore.sectors,
            industries: window.dataStore.industries,
            etfs: window.dataStore.etfs,
            sparkSignals: window.dataStore.sparkSignals,
            midSignals: window.dataStore.midSignals || {}
        };

        dbIframe.contentWindow.postMessage(payload, "*");
        console.log("✈️ Komplettpaket an iFrame gesendet.");
    }

    // Routing starten
    showTool("cockpit");
});
