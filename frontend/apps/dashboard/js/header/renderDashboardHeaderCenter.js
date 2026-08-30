export function renderDashboardHeaderCenter(state) {
    const container = document.getElementById("dashboard-header-center");
    if (!container) return;

    const parts = [];

    parts.push(`<span class="bc-link" data-bc="reset">All Sectors</span>`);

    // ⭐ Falls eine Strategie aktiv ist, diese als ersten Hauptfilter anzeigen
    if (state.strategy && state.strategy !== "none") {
        parts.push(`<span class="bc-sep">›</span>`);
        parts.push(`<span class="bc-link" data-bc="strategy">Strategy: ${state.strategy}</span>`);
    }

    // ⭐ Falls ein Index-Filter aktiv ist
    if (state.indexFilter && state.indexFilter !== "all") {
        parts.push(`<span class="bc-sep">›</span>`);
        parts.push(`<span class="bc-link" data-bc="index">Index: ${state.indexFilter}</span>`);
    }

    if (state.sector) {
        parts.push(`<span class="bc-sep">›</span>`);
        parts.push(`<span class="bc-link" data-bc="sector" data-sector="${state.sector}">${state.sector}</span>`);
    }

    if (state.industry) {
        parts.push(`<span class="bc-sep">›</span>`);
        parts.push(`<span class="bc-link" data-bc="industry" data-industry="${state.industry}">${state.industry}</span>`);
    }

    if (state.ticker) {
        parts.push(`<span class="bc-sep">›</span>`);
        parts.push(`<span class="bc-item">${state.ticker}</span>`);
    }

    container.innerHTML = `
        <div class="breadcrumbs-block">
            <div class="page-title-small">RS Dashboard</div>

            <div id="breadcrumbs" class="breadcrumbs">
                ${parts.join("")}
            </div>

            <button id="reset-btn" class="reset-btn">Reset</button>
        </div>
    `;

const resetBtn = container.querySelector("#reset-btn");

if (resetBtn) {
    resetBtn.addEventListener("click", () => {
        console.log("DEBUG: Reset-Button geklickt");
        document.dispatchEvent(new CustomEvent("dashboard:reset"));
    });
}
}