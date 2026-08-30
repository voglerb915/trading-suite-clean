export function renderDashboardHeaderRight(state) {
    const container = document.getElementById("dashboard-header-right");
    if (!container) return;

    container.innerHTML = `
        <div class="control-block">

            <div class="strategy-row">
                <label for="strategy-select">Strategy:</label>
                <select id="strategy-select">
                    <option value="none">none</option>
                    <option value="high52w">52-week High</option>
                    <option value="insideday52w">Inside Day @ 52W-High</option>
                    <option value="nearhigh52">Max. 5% below High</option>
                    <option value="stage3topping">Stage3 to Stage4</option>
                </select>
            </div>

            <div class="strategy-row">
                <label for="index-select">Index:</label>
                <select id="index-select">
                    <option value="all">All</option>
                    <option value="DJI">DJIA</option>
                    <option value="NDX">NASDAQ-100</option>
                    <option value="SP500">S&P 500</option>
                    <option value="RUT">Russell 2000</option>
                </select>
            </div>

            <div id="ticker-search-container">
                <input id="ticker-search" type="text" placeholder="Ticker search..." autocomplete="off" />
                <button id="delete-btn">Delete</button>
                <div id="search-suggestions" class="suggestions"></div>
            </div>

        </div>
    `;

    // Strategy-Dropdown auf aktuellen State setzen
    document.getElementById("strategy-select").value =
        state.strategy ?? state.strategyName ?? "none";

    // Index-Dropdown auf aktuellen State setzen
    document.getElementById("index-select").value =
        state.index ?? state.indexFilter ?? "all";

    // FIX: Bleibe lokal im Iframe-Dokument, damit dashboard.js die Events empfängt
    const targetDoc = document;

    console.log("📌 HeaderRight: targetDoc ist lokales document");

    // Strategy
    document.getElementById("strategy-select").addEventListener("change", (e) => {
        console.log("📌 HeaderRight: Strategy-Dropdown geändert:", e.target.value);
        targetDoc.dispatchEvent(
            new CustomEvent("dashboard:strategyChange", {
                detail: e.target.value
            })
        );
    });

    // Index
    document.getElementById("index-select").addEventListener("change", (e) => {
        console.log("📌 HeaderRight: Index-Dropdown geändert:", e.target.value);
        targetDoc.dispatchEvent(
            new CustomEvent("dashboard:indexChange", {
                detail: e.target.value
            })
        );
    });

    // ⭐ SEARCH → Event dispatchen
    document.getElementById("ticker-search").addEventListener("input", (e) => {
        const value = e.target.value.toUpperCase();
        targetDoc.dispatchEvent(
            new CustomEvent("dashboard:searchChange", {
                detail: value
            })
        );
    });

    // ⭐ DELETE
    document.getElementById("delete-btn").addEventListener("click", () => {
        window.dashboardState.search = "";
        const searchInput = document.getElementById("ticker-search");
        searchInput.value = "";

        targetDoc.dispatchEvent(
            new CustomEvent("dashboard:searchChange", {
                detail: ""
            })
        );

        // Falls updateAndRenderDashboard global verfügbar ist, wird es hier aufgerufen
        if (typeof updateAndRenderDashboard === 'function') {
            updateAndRenderDashboard();
        }
        searchInput.focus();
    });

    // 🟢 Search-Feld nach Rendern wiederherstellen + Fokus halten
    const searchInput = document.getElementById("ticker-search");
    searchInput.value = state.search || "";

    if (state.search && state.search.length > 0) {
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
}