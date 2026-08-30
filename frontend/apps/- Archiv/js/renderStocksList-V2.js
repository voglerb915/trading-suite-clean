import { sectorClasses } from "../../../../shared/logic/sectorColors.js";
import { getSectorClass, getDiffColor, formatDiff, renderRankCircle } 
    from "../helpers/renderHelpers.js";
import { passesSignalFilter } from "../helpers/filterHelpersStocks.js";



export function renderStockSignalDot(ticker) {
    const store = window.dataStore || {};
    const signals = store.sparkSignals?.stocks || {};
    const sig = signals[ticker];

    if (!sig) return "";
    if (sig.signal === "entry") return `<span class="sig-dot entry"></span>`;
    if (sig.signal === "exit")  return `<span class="sig-dot exit"></span>`;
    return "";
}

window.renderStockSignalDot = renderStockSignalDot;


export function renderStocksList(stocks, state) {
    
    const listUl = document.getElementById('stocks-list');
    if (!listUl) return;

    if (!stocks || stocks.length === 0) {
        listUl.innerHTML = `
            <li class="stock-item empty">
                Keine Treffer für Strategy '${state?.strategy || "none"}'
            </li>
        `;
        return;
    }

// 1. Sector
if (state.sector && state.sector !== "all") {
    stocks = stocks.filter(s => s.sector === state.sector);
}

// 2. Industry
if (state.industry && state.industry !== "all") {
    stocks = stocks.filter(s => s.industry === state.industry);
}

// 3. Index
if (state.indexFilter && state.indexFilter !== "all") {
    stocks = stocks.filter(s =>
        Array.isArray(s.index) &&
        s.index.includes(state.indexFilter)
    );
}

/*
// 4. Search - wird im Cockpit gemacht
if (state.search && state.search.length > 0) {
    const q = state.search.toUpperCase().split(" ");

    stocks = stocks.filter(s => {
        const ticker = s.ticker?.toUpperCase() || "";
        const company = s.company?.toUpperCase() || "";

        return q.every(part =>
            ticker.includes(part) ||
            company.includes(part)
        );
    });
}
*/

// ⭐ 5. Signal-Filter (Nutze die Variablen, die du auch im State hast)
stocks = stocks.filter(s =>
    passesSignalFilter(
        window.dataStore?.sparkSignals?.stocks?.[s.ticker],
        state.filterBuyStocks, // HIER angepasst
        state.filterSellStocks    // HIER angepasst
    )
);

// --- HIER NEU: Sortierung einfügen ---
const sortedStocks = [...stocks].sort((a, b) => {
    // Wenn eine Strategie aktiv ist, sortiere nach Value (höchster zuerst)
    if (state.strategy && state.strategy !== "none") {
        const valA = a.strategyValue ?? a.value ?? 0;
        const valB = b.strategyValue ?? b.value ?? 0;
        return valB - valA; 
    }
    // Standard: Sortiere nach globalRank (niedrigster Rank zuerst)
    const rankA = a.globalRank ?? a.rsRank ?? a.rank ?? Infinity;
    const rankB = b.globalRank ?? b.rsRank ?? b.rank ?? Infinity;
    return rankA - rankB;
});

// 🟢 Stocks-Pille aktualisieren
const pillContainer = document.getElementById("stocks-pill-container");
if (pillContainer) {
    pillContainer.innerHTML = `
    <span class="pill pill-count">${stocks.length}</span>

    <span class="pill pill-buy ${state.filterBuyStocks ? 'active' : ''}" 
        data-type="filterBuyStocks">Buy</span>
    <span class="pill pill-sell ${state.filterSellStocks ? 'active' : ''}" 
        data-type="filterSellStocks">Sell</span>
    `;
}

// 🟢 Export-Buttons im Header initialisieren
const btnContainer = document.getElementById("stocks-button-container");
if (btnContainer && btnContainer.children.length === 0) {
    btnContainer.innerHTML = `
        <button class="export-btn" id="btn-to-watchlist" title="Send to Watchlist">
            <svg viewBox="0 0 24 24" style="fill:#6A1B9A; width:20px; height:20px;"><path d="M3 4v16h18V4H3zm2 2h14v12H5V6zm2 2v2h10V8H7zm0 4v2h6v-2H7z"/></svg>
        </button>
        <button class="export-btn" id="export-tv" title="Export for TradingView">
            <svg viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg" style="width:22px; height:18px; vertical-align: middle;">
                <path d="M14 22H7V11H0V4h14v18zM28 22h-8l7.5-18h8L28 22z" fill="currentColor"/>
                <circle cx="20" cy="8" r="4" fill="currentColor"/>
            </svg>
        </button>
        <button class="export-btn" id="export-hp" title="Export for Homepage">
            <svg viewBox="0 0 24 24" style="fill:#43A047; width:20px; height:20px;"><path d="M12 3l9 8h-3v10h-12v-10h-3z"/></svg>
        </button>
        <button class="export-btn" id="export-analyse" title="Analysis-Export">
            <svg viewBox="0 0 24 24" style="fill:#FB8C00; width:20px; height:20px;"><path d="M5 4h3v16h-3zm6 6h3v10h-3zm6-4h3v14h-3z"/></svg>
        </button>
    `;
}

const visible = [...sortedStocks];

const html = visible.map((item, idx) => {

    // ⭐⭐⭐ FIX: Strategy-Daten mergen (für Stage 3 & InsideDay52w) ⭐⭐⭐
    let mergedItem = item;

    if (dashboardState.strategy === "stage3topping") {
        const stratArr = dashboardState.strategyItems?.stage3topping || [];
        const stratData = stratArr.find(s => s.ticker === item.ticker);
        if (stratData) {
            mergedItem = { ...item, ...stratData };
        }
    } else if (dashboardState.strategy === "insideday52w") {
        const stratArr = dashboardState.strategyItems?.insideday52w || [];
        const stratData = stratArr.find(s => s.ticker === item.ticker);
        if (stratData) {
            mergedItem = { ...item, ...stratData };
        }
    }
    // <-- HIER EINBAUEN
    if (mergedItem.ticker === "AAPL" || idx === 0) {
        console.log("DEBUG mergedItem:", mergedItem);
    }
    // ⭐⭐⭐ Ende FIX ⭐⭐⭐


    const isSelected = mergedItem.ticker === state?.ticker;
    const sectorClass = sectorClasses[mergedItem.sector] ?? "";

    const position = idx + 1;

    const displaySector = mergedItem.sector ?? "—";
    const displayIndustry = mergedItem.industry ?? "—";

    const clickHandler = `onclick="handleStockClick('${mergedItem.ticker}', '${mergedItem.industry}', '${mergedItem.sector}')"`;


    // Global Rank
    const globalRank =
        mergedItem.globalRank ??
        mergedItem.rsRank ??
        mergedItem.rank ??
        null;

    const bottomValue = globalRank != null
        ? `Global: ${globalRank}`
        : "Global: —";

    // ⭐ FIX: rawTop definieren
    let rawTop = null;

   // Top Value – je nach Strategie den richtigen Wert wählen
    switch (state.strategy) {
        case "high52w":
        case "nearhigh52":
            rawTop = mergedItem.strategyValue ?? mergedItem.value ?? null;
            break;

        case "insideday52w":
            rawTop = mergedItem.strategyValue ?? mergedItem.tightness ?? mergedItem.value ?? null;
            break;

        case "stage3topping":
            rawTop = mergedItem.strategyValue ?? mergedItem.score ?? mergedItem.totalScore ?? null;
            break;

        case "none":
        default:
            rawTop = mergedItem.strategyValue ?? mergedItem.value ?? mergedItem.rsScore ?? mergedItem.score ?? null;
            break;
    }


    let topValue;
    if (rawTop != null) {
        const percentStrategies = ["high52w", "insideday52w", "nearhigh52"];

        const formatted = percentStrategies.includes(state.strategy)
            ? `${rawTop.toFixed(2)}%`
            : rawTop.toFixed(2);

        topValue = state.strategy && state.strategy !== "none"
            ? `<strong class="strategy-value-strong">${formatted}</strong>`
            : `<span class="score-value">${formatted}</span>`;
    } else {
        topValue = "—";
    }

    const fmt = v => (typeof v === "number" ? v.toFixed(2) : (v ?? "—"));

    return `
        <li class="stock-item ${sectorClass} ${isSelected ? 'highlight-ticker' : ''}"
            data-stock="${mergedItem.ticker}"
            ${clickHandler}>

            <div class="stock-row-inner">

                <!-- LINKS -->
                <div class="stock-left">

                    ${isSelected ? '▶ ' : ''}

                    ${renderRankCircle(
                        position,
                        window.dataStore?.sparkSignals?.stocks?.[mergedItem.ticker]
                    )}

                    <span class="stock-ticker">${mergedItem.ticker}</span><br>

                    <span class="stock-sub">
                        ${displaySector} | ${displayIndustry}
                    </span>
                </div>

                <!-- RECHTS -->
                <div class="stock-right">

                    <div style="
                        display: grid;
                        grid-template-columns: auto 1fr;
                        align-items: center;
                        font-weight: bold;
                        color: #444;
                        font-size: 1rem;
                        white-space: nowrap;
                        text-align: right;
                    ">

                        <!-- Tooltip für stage3topping -->
                        ${dashboardState.strategy === "stage3topping" ? `
                            <span class="score-tooltip-trigger" style="margin-right:8px; cursor:help;">
                                📊
                                <div class="score-tooltip">
                                    <div class="score-row">
                                        <span class="score-label">S1 StateActive</span>
                                        <span class="score-value">${fmt(mergedItem.score_stateActive)}</span>
                                        <span class="score-raw">${mergedItem.stateActive}</span>
                                    </div>
                                    <div class="score-row">
                                        <span class="score-label">S2 Age</span>
                                        <span class="score-value">${fmt(mergedItem.score_age)}</span>
                                        <span class="score-raw">${mergedItem.daysAbove}</span>
                                    </div>
                                    <div class="score-row">
                                        <span class="score-label">S3 Slope</span>
                                        <span class="score-value">${fmt(mergedItem.score_slope)}</span>
                                        <span class="score-raw">${mergedItem.slopeVal}</span>
                                    </div>
                                    <div class="score-row">
                                        <span class="score-label">S4 IndRank</span>
                                        <span class="score-value">${fmt(mergedItem.score_indRank)}</span>
                                        <span class="score-raw">${mergedItem.indRank}</span>
                                    </div>
                                    <div class="score-row">
                                        <span class="score-label">S5 SMA Dist</span>
                                        <span class="score-value">${fmt(mergedItem.score_smaDist)}</span>
                                        <span class="score-raw">${mergedItem.smaDist}</span>
                                    </div>
                                    <div class="score-total">
                                        <span class="score-label">Total</span>
                                        <span class="score-value">${fmt(mergedItem.totalScore)}</span>
                                    </div>
                                </div>
                            </span>
                        ` : dashboardState.strategy === "insideday52w" ? `
                        <!-- Tooltip für insideday52w im gleichen Look -->
                            <span class="score-tooltip-trigger" style="margin-right:8px; cursor:help;">
                                📊
                                <div class="score-tooltip">
                                    <div class="score-row">
                                        <span class="score-label">Tightness</span>
                                        <span class="score-value">${fmt(mergedItem.tightness)}</span>
                                    </div>
                                    <div class="score-row">
                                        <span class="score-label">VMA 20</span>
                                        <span class="score-value">${fmt(mergedItem.vma_20)}</span>
                                    </div>
                                    <div class="score-row">
                                        <span class="score-label">Setup Status</span>
                                        <span class="score-value">${mergedItem.setupStatus ?? "—"}</span>
                                    </div>
                                    <div class="score-row">
                                        <span class="score-label">Anchor High</span>
                                        <span class="score-value">${fmt(mergedItem.anchorHigh)}</span>
                                    </div>
                                    <div class="score-row">
                                        <span class="score-label">Anchor Low</span>
                                        <span class="score-value">${fmt(mergedItem.anchorLow)}</span>
                                    </div>
                                </div>
                            </span>
                        ` : `
                            <span></span>
                        `}


                        <!-- StrategyValue rechtsbündig -->
                        <span>${topValue}</span>
                    </div>

                    <!-- Rank bleibt unverändert -->
                    <div>${bottomValue}</div>

                </div>

            </div>
        </li>
    `;

}).join('');
    listUl.innerHTML = html;
}
