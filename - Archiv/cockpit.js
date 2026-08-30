/*----------------------------------
1. Globaler State
----------------------------------*/
let currentToolId = "cockpit"; // Start-Tool

// Globaler Cockpit-State
window.cockpitState = {
    stocks: [],
    sectors: [],
    industries: [],

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
    strategyCache: new Map()
};


/*----------------------------------
2. Imports
----------------------------------*/
import { renderCockpit } from "./js/renderCockpit.js";


/*----------------------------------
3. Navigation (Host-System)
----------------------------------*/
// 🔥 Universelles Broadcast-System für alle iFrames
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

function showTool(toolId) {
    console.log("Wechsle zu:", toolId);

    document.querySelectorAll(".tool-iframe").forEach(el =>
        el.classList.remove("active")
    );
    document.querySelectorAll(".tool-view").forEach(el =>
        el.classList.remove("active")
    );

    document.querySelectorAll("#main-nav a").forEach(link =>
        link.classList.remove("active-link")
    );
    const activeLink = document.querySelector(`#main-nav a[data-tool="${toolId}"]`);
    if (activeLink) activeLink.classList.add("active-link");

    if (toolId === "cockpit") {
        document.getElementById("cockpit-ui")?.classList.add("active");
        currentToolId = toolId;
        return;
    }

    const targetIframe = document.getElementById(`iframe-${toolId}`);
    if (targetIframe) {
        targetIframe.classList.add("active");
        currentToolId = toolId;
    } else {
        console.warn(`Kein Container für Tool-ID "${toolId}" gefunden`);
    }
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

// Strategy-Wechsel
document.addEventListener("dashboard:strategyChange", async (e) => {
    const strategy = e.detail;
    console.log("EVENT RECEIVED STRATEGY:", strategy);

    window.cockpitState.strategy = strategy;

    await applyStrategy(strategy);
});


// Index-Wechsel
document.addEventListener("dashboard:indexChange", (e) => {
    const index = e.detail;
    window.cockpitState.index = index;
    applyFiltersAndSort();
});

// Ticker-Suche
document.addEventListener("dashboard:search", (e) => {
    const query = e.detail;
    window.cockpitState.search = query;
    applyFiltersAndSort();
});


/*----------------------------------
5b. Strategy-Handler
----------------------------------*/

// 1) Strategy-Daten laden + cachen
async function loadStrategyStocks(strategyName) {
    console.log("loadStrategyStocks START:", strategyName);

    if (window.dataStore.strategyCache.has(strategyName)) {
        const cached = window.dataStore.strategyCache.get(strategyName);
        console.log("CACHED STRATEGY LENGTH:", cached.length);
        return cached;
    }

    const res = await fetch(`/api/strategy/${strategyName}`);
    const json = await res.json();

    console.log("API STRATEGY LENGTH:", json.count);

    window.dataStore.strategyCache.set(strategyName, json.data);
    return json.data;
}

// 2) Strategy + DataLayer mergen (Filter entfernt!)
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

            // 🔥 Strategy-Werte NACH base/m/f setzen (damit sie NICHT überschrieben werden)
            strategyRank: item.strategyRank,
            strategyValue: item.strategyValue
        };
    });
}

// 3) Strategy-Wechsel – wird vom Dashboard aufgerufen
export async function applyStrategy(strategyName) {
    console.log("applyStrategy START:", strategyName);

    const isReset = !strategyName || strategyName === "none";

    if (isReset) {
        const stocks = window.dataStore.baseStocks;

        window.cockpitState.strategy = "none";
        window.cockpitState.stocks = stocks;

        // ✔ Strategy IMMER mitsenden
        broadcastMessage("UPDATE_STOCKS", { 
            stocks,
            strategy: "none"
        });

        renderCockpit(window.cockpitState);
        return;
    }

    // Strategy laden
    const strategyItems = await loadStrategyStocks(strategyName);
    console.log("STRATEGY RAW ITEM:", strategyItems[0]);

    // Strategy + DataLayer mergen
    const stocks = mergeStrategyWithDataLayer(strategyItems);

    // Cockpit-State aktualisieren
    window.cockpitState.strategy = strategyName;
    window.cockpitState.stocks = stocks;

    // ✔ Strategy IMMER mitsenden
    broadcastMessage("UPDATE_STOCKS", { 
        stocks,
        strategy: strategyName
    });

    renderCockpit(window.cockpitState);
}


/*----------------------------------
5c. Filter & Sortierung (für Cockpit-UI)
----------------------------------*/
function filterStocks(state, stocks) {
    let result = [...stocks];

    if (state.sector && state.sector !== "all") {
        result = result.filter(s => {
            const stockSector = s.sector || s.sector_name;
            return stockSector === state.sector;
        });
    }

    if (state.industry) {
        result = result.filter(s => {
            const stockIndustry = s.industry || s.industry_name;
            return stockIndustry === state.industry;
        });
    }

    if (state.index && state.index !== "all") {
        result = result.filter(s => Array.isArray(s.index) && s.index.includes(state.index));
    }

    if (state.volFilterActive) {
        result = result.filter(s => {
            const vol = Number(s.volume || 0);
            const vma = Number(s.vma_20 || 0);
            return vma > 0 && vol > vma * 2;
        });
    }

    if (state.search && state.search.length > 1) {
        const q = state.search.toLowerCase();
        result = result.filter(s =>
            s.ticker.toLowerCase().includes(q) ||
            s.name?.toLowerCase().includes(q)
        );
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
    const filtered = filterStocks(window.cockpitState, window.cockpitState.stocks);
    const sorted = sortStocks(window.cockpitState, filtered);

    renderCockpit({
        ...window.cockpitState,
        stocks: sorted
    });
}


/*----------------------------------
6. Initialisierung
----------------------------------*/
async function loadBaseData() {
    const [stocksRes, sectorsRes, industriesRes, etfsRes] = await Promise.all([
        fetch("/api/market/stocks"),
        fetch("/api/market/sectors"),
        fetch("/api/market/industries"),
        fetch("/api/market/etfs")
    ]);

    window.dataStore.baseStocks  = await stocksRes.json();
    window.dataStore.sectors     = await sectorsRes.json();
    window.dataStore.industries  = await industriesRes.json();
    window.dataStore.etfs        = await etfsRes.json();

    window.dataStore.metrics = {};
    window.dataStore.finviz  = {};
}

let isCockpitDataReady = false;

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Cockpit Initialisierung gestartet...");

    window.addEventListener("message", (event) => {
        if (event.data?.type === "system-status-update") {
            updateHeaderSystemBadge(event.data.badge, event.data.text);
        }

        if (event.data?.type === "DASHBOARD_READY") {
            console.log("📥 Dashboard-iFrame hat sich gemeldet.");
            if (isCockpitDataReady) {
                const dbIframe = document.getElementById("iframe-dashboard");
dbIframe.contentWindow.postMessage({ type: "COCKPIT_DATA_READY" }, "*");

            }
        }
    });

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

    document.querySelectorAll("#main-nav a").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const tool = link.getAttribute("data-tool");
            if (tool) showTool(tool);
        });
    });

    await loadBaseData();
    isCockpitDataReady = true;

    // ❗ BaseStocks nur setzen, wenn KEINE Strategy aktiv ist
if (!window.cockpitState.strategy || window.cockpitState.strategy === "none") {
    window.cockpitState.stocks = window.dataStore.baseStocks;
    renderCockpit(window.cockpitState);
}

// 🔥 Broadcast der globalen Daten an ALLE iFrames
broadcastMessage("MARKET_STATE", { state: window.cockpitState.market });
broadcastMessage("SECTORS", { sectors: window.cockpitState.sectors });
broadcastMessage("INDEX_PERFORMANCE", { index: window.cockpitState.index });


    showTool("cockpit");

const dbIframe = document.getElementById("iframe-new-dashboard");
if (dbIframe && dbIframe.contentWindow) {
    console.log("Cockpit → Dashboard: sende COCKPIT_DATA_READY");
    dbIframe.contentWindow.postMessage({ type: "COCKPIT_DATA_READY" }, "*");
}

});
