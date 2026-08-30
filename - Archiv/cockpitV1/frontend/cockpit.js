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
2. Messaging: Cockpit-Daten senden (OPTIMIERT)
----------------------------------*/
/*----------------------------------
2. Messaging: Cockpit-Daten senden (OPTIMIERT)
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
// Diese Funktion ist gut, aber achte darauf, dass sie nicht mit
// sendCockpitData kollidiert, wenn sie das gleiche Ziel hat.
export function broadcastMessage(type, payload = {}) {
    const frames = document.querySelectorAll(".tool-iframe");
    frames.forEach(frame => {
        try {
            frame.contentWindow.postMessage({ type, ...payload }, "*");
        } catch (err) {
            console.warn("Broadcast-Fehler:", frame.id, err);
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
        
        // 🟢 FIX: Wenn wir umschalten, senden wir die aktuellen Daten 
        // explizit an dieses iFrame, falls es sie beim Start verpasst hat
        sendCockpitData(); 
        return;
    }

    console.warn("Tool nicht gefunden:", toolId);
}
/*----------------------------------
4. UI-Layer & Zentrale Sync-Logik
----------------------------------*/
function updateHeaderSystemBadge(badge, text) {
    const el = document.getElementById("header-system-badge");
    if (!el) return;
    el.className = "";
    el.classList.add(`header-badge-${badge}`);
    el.textContent = text;
}

// ❌ syncCockpit wurde entfernt — NICHT MEHR VERWENDEN

/*----------------------------------
5. Event-Handler
----------------------------------*/
document.addEventListener("click", (e) => {
    if (e.target.id === "header-system-badge") {
        showTool("control");
    }
});

// 5a. Events vom Dashboard → Cockpit
document.addEventListener("dashboard:strategyChange", async (e) => {
    const strategyName = e.detail;
    console.log("dashboard:strategyChange", strategyName);

    window.cockpitState.strategy = strategyName;

    // Sonderfall: Strategy NONE → zurück zur Basisliste
    if (!strategyName || strategyName === "none") {
        window.cockpitState.stocks = window.dataStore.baseStocks;
        window.cockpitState.stocksOriginal = window.dataStore.baseStocks;
        applyFiltersAndSort();
        return;
    }

    // Normale Strategy
    await applyStrategy(strategyName);
});


document.addEventListener("dashboard:indexChange", (e) => {
    window.cockpitState.index = e.detail;
    applyFiltersAndSort();
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
                  || window.dataStore.etfs.find(e => e.ticker === item.ticker) || {};
        const m = window.dataStore.metrics[item.ticker] || {};
        const f = window.dataStore.finviz[item.ticker] || {};

        return {
            ...base, ...m, ...f,
            ticker: item.ticker,
            sector: base.sector ?? f.sector ?? null,
            industry: base.industry ?? f.industry ?? null,
            strategyRank: item.strategyRank,
            strategyValue: item.strategyValue,
            prevClose: base.prevClose ?? m.prevClose ?? f.prevClose ?? null,
        };
    });
}

async function applyStrategy(strategyName) {
    console.log("Cockpit: applyStrategy:", strategyName);

    // Strategy laden
    const strategyItems = await loadStrategyStocks(strategyName);
    console.log("STRATEGY RAW:", strategyItems);

    // Strategy + DataLayer mergen (RICHTIGE FUNKTION!)
    const merged = mergeStrategyWithDataLayer(strategyItems);

    // State aktualisieren
    window.cockpitState.stocks = merged;
    window.cockpitState.stocksOriginal = merged;

    // Filter anwenden + Dashboard updaten
    applyFiltersAndSort();
}


/*----------------------------------
5c. Filter & Sortierung
----------------------------------*/
function filterStocks(state, stocks) {
    let result = [...stocks];
    if (state.sector && state.sector !== "all") result = result.filter(s => (s.sector || s.sector_name) === state.sector);
    if (state.industry) result = result.filter(s => (s.industry || s.industry_name) === state.industry);
    if (state.index && state.index !== "all") result = result.filter(s => Array.isArray(s.index) && s.index.includes(state.index));
    if (state.volFilterActive) result = result.filter(s => Number(s.vma_20 || 0) > 0 && Number(s.volume || 0) > Number(s.vma_20 || 0) * 2);
    if (state.search?.length >= 1) {
        const q = state.search.toLowerCase();
        result = result.filter(s => s.ticker?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q));
        result.sort((a, b) => (a.ticker.toLowerCase().startsWith(q) ? -1 : 1));
    }
    return result;
}

function sortStocks(state, stocks) {

    const isStrategyMode = state.strategy && state.strategy !== "none";

    // 🟥 Strategy aktiv → StrategyValue DESC
    if (isStrategyMode) {
        return [...stocks].sort((a, b) => {
            const valA = a.strategyValue ?? -99999;
            const valB = b.strategyValue ?? -99999;
            return valB - valA; // DESC
        });
    }

    // 🟩 Strategy none → globalRank ASC
    return [...stocks].sort((a, b) => {
        const rankA = a.globalRank ?? 99999;
        const rankB = b.globalRank ?? 99999;
        return rankA - rankB; // ASC
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

    // ⭐ Komplettpaket an Cockpit senden (Renderer)
    sendCockpitData();
}


/*----------------------------------
6. Initialisierung (OPTIMIERT)
----------------------------------*/
async function loadBaseData() {
    // 1. Alle Daten parallel abrufen
    const [stocks, sectors, industries, etfs, midSignalsData] = await Promise.all([
        fetch("/api/market/stocks").then(r => r.json()),
        fetch("/api/market/sectors").then(r => r.json()),
        fetch("/api/market/industries").then(r => r.json()),
        fetch("/api/market/etfs").then(r => r.json()),
        fetch("/api/signals/mid-signal").then(r => r.json())
    ]);

    // 2. SparkSignals laden
    let sparklineSignals = null;
    try {
        const sparkRes = await fetch("/api/sparksignals");
        const sparkJson = await sparkRes.json();
        if (sparkJson?.success) sparklineSignals = sparkJson.sparkline;
    } catch (err) { console.error("Fehler SparkSignals:", err); }

    // 3. DataStore befüllen
    window.dataStore.baseStocks = stocks;
    window.dataStore.sectors = sectors;
    window.dataStore.industries = industries;
    window.dataStore.etfs = etfs;
    window.dataStore.midSignals = {
        stocks: midSignalsData.reduce((acc, signal) => { acc[signal.ticker] = signal; return acc; }, {})
    };
    window.dataStore.sparkSignals = {
        industries: sparklineSignals?.industries ?? {},
        sectors: sparklineSignals?.sectors ?? {},
        stocks: sparklineSignals?.stocks ?? {}
    };

// 4. CockpitState vorbereiten
window.cockpitState.stocks = stocks;
window.cockpitState.stocksOriginal = stocks;
window.cockpitState.volumeExtract = computeVolumeExtract(stocks);

// 5. System informieren
window.dispatchEvent(new CustomEvent("dataStoreReady"));

// Dashboard initial mit Stocks versorgen
sendFilteredStocksToDashboard(stocks);

// Cockpit informieren
sendCockpitData();
// Dashboard initialisieren
window.parent.postMessage({
    type: "INIT_DASHBOARD",
    stocks: stocks,
    sectors: sectors,
    industries: industries,
    etfs: etfs,
    midSignals: window.dataStore.midSignals,
    sparkSignals: window.dataStore.sparkSignals
}, "*");


console.log("✅ Cockpit initialisiert & synchronisiert.");

}

/*----------------------------------
7. DOMContentLoaded – FINAL & STABIL
----------------------------------*/
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Cockpit Initialisierung gestartet...");

    // Device Info + Badge (WICHTIG: Status-Infos beibehalten)
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

    // Basisdaten laden & initialer Sync
    await loadBaseData(); 
    // loadBaseData() ruft intern syncCockpit() auf, 
    // was die Daten an das Dashboard pusht.

    // Routing starten
    showTool("cockpit");
});