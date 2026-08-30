// =========================================================
//  Cockpit Renderer
//  (UI für die Cockpit-App, NICHT der globale Controller)
// =========================================================

// ---------------------------------------------------------
//  1) Root Renderer
// ---------------------------------------------------------
export function renderCockpit(state) {
    renderCockpitHeader(state);
    renderCockpitTop20(state);
    renderCockpitIndexPerformance(state);
    renderCockpitSectorOverview(state);
}



// ---------------------------------------------------------
//  2) Header (Systemstatus + Breadcrumbs + Datum)
// ---------------------------------------------------------
function renderCockpitHeader(state) {
    const el = document.getElementById("cockpit-header");
    if (!el) return;

    el.innerHTML = `
        <div class="cockpit-header-left">
            <h2>System Status</h2>
            <div id="cockpit-system-status">—</div>
        </div>

        <div class="cockpit-header-right">
            <div class="cockpit-breadcrumbs">${state.breadcrumbs}</div>
            <div class="cockpit-date">${new Date().toLocaleDateString()}</div>
        </div>
    `;
}



// ---------------------------------------------------------
//  3) Top 20 Stocks (aus globalem State)
// ---------------------------------------------------------
function renderCockpitTop20(state) {
    const el = document.getElementById("cockpit-top20");
    if (!el) return;

    const top20 = [...state.stocks]
        .sort((a, b) => (b.rsScore ?? 0) - (a.rsScore ?? 0))
        .slice(0, 20);

    el.innerHTML = `
        <h3>Top 20 Stocks</h3>
        <ul class="cockpit-list">
            ${top20.map(s => `
                <li>
                    <span class="ticker">${s.ticker}</span>
                    <span class="score">${(s.rsScore ?? 0).toFixed(2)}</span>
                </li>
            `).join("")}
        </ul>
    `;
}



// ---------------------------------------------------------
//  4) Index Performance (Tagesperformance)
// ---------------------------------------------------------
function renderCockpitIndexPerformance(state) {
    const el = document.getElementById("cockpit-index-performance");
    if (!el) return;

    // Beispiel: später ersetzt durch echte Index-Daten
    const mockIndexes = [
        { name: "NASDAQ", perf: 1.23 },
        { name: "S&P 500", perf: 0.87 },
        { name: "DAX", perf: -0.12 }
    ];

    el.innerHTML = `
        <h3>Index Performance</h3>
        <ul class="cockpit-list">
            ${mockIndexes.map(i => `
                <li>
                    <span class="index">${i.name}</span>
                    <span class="perf" style="color:${i.perf >= 0 ? '#4caf50' : '#f44336'}">
                        ${i.perf >= 0 ? '+' : ''}${i.perf}%
                    </span>
                </li>
            `).join("")}
        </ul>
    `;
}



// ---------------------------------------------------------
//  5) Sector Overview (Mini-Chart oder Liste)
// ---------------------------------------------------------
function renderCockpitSectorOverview(state) {
    const el = document.getElementById("cockpit-sectors");
    if (!el) return;

    // Beispiel: später ersetzt durch echte Sector-Daten
    const mockSectors = [
        { name: "Technology", perf: 2.1 },
        { name: "Energy", perf: -0.4 },
        { name: "Healthcare", perf: 0.9 }
    ];

    el.innerHTML = `
        <h3>Sector Overview</h3>
        <ul class="cockpit-list">
            ${mockSectors.map(s => `
                <li>
                    <span class="sector">${s.name}</span>
                    <span class="perf" style="color:${s.perf >= 0 ? '#4caf50' : '#f44336'}">
                        ${s.perf >= 0 ? '+' : ''}${s.perf}%
                    </span>
                </li>
            `).join("")}
        </ul>
    `;
}
