import { sectorClasses } from "../../../../shared/logic/sectorColors.js";

export function renderDashboardHeaderLeft(state) {
    const box = document.getElementById("dashboard-header-left");
    if (!box) return;

    const ref = state?.referenceStock;

    // Keine Auswahl & keine Stocks verfügbar → Absoluter Fallback für den leeren Start
    if (!ref) {
        let globalLastUpdate = "—";
        if (state?.stocks?.[0]?.anl_datum) {
            globalLastUpdate = new Date(state.stocks[0].anl_datum).toISOString().substring(0, 10);
        }

        box.className = "reference-box";
        box.innerHTML = `
            <div class="ref-header">
                <h2>No Selection</h2>
                <div class="company-name">—</div>
            </div>
            <div class="ref-row">
                <div><strong>Sector:</strong> —</div><div></div>
                <div><strong>Industry:</strong> —</div><div></div>
            </div>
            <div class="ref-row">
                <div><strong>Strategy Rank:</strong> —</div><div></div>
                <div><strong>Global Rank:</strong> —</div><div></div>
            </div>
            <div class="ref-row">
                <div><strong>Price:</strong> —</div><div></div>
                <div><strong>Strategy:</strong> ${state?.strategy || "none"}</div><div></div>
            </div>
            <div class="ref-row">
                <div><strong>Last Update:</strong> ${globalLastUpdate}</div><div></div>
                <div><strong>Score:</strong> —</div><div></div>
            </div>
        `;
        return;
    }

    // Standard-Rendering mit rsRank
    const sectorClass = sectorClasses[ref.sector] ?? "";
    box.className = `reference-box ${sectorClass}`;

    const finvizDate = ref.anl_datum ? new Date(ref.anl_datum).toISOString().substring(0, 10) : "—";
    const score = typeof ref.rsScore === "number" ? ref.rsScore.toFixed(2) : "—";

    box.innerHTML = `
        <div class="ref-header">
            <h2>${ref.ticker}</h2>
            <div class="company-name">${ref.company || "—"}</div>
        </div>

        <div class="ref-row">
            <div><strong>Sector:</strong> ${ref.sector}</div><div></div>
            <div><strong>Industry:</strong> ${ref.industry}</div><div></div>
        </div>

        <div class="ref-row">
            <div><strong>Strategy Rank:</strong> ${ref.strategyRank || "—"}</div><div></div>
            <div><strong>Global Rank:</strong> ${ref.rsRank || "—"}</div><div></div>
        </div>

        <div class="ref-row">
            <div><strong>Price:</strong> ${ref.price || "—"}</div><div></div>
            <div><strong>Strategy:</strong> ${state?.strategy || "none"}</div><div></div>
        </div>

        <div class="ref-row">
            <div><strong>Last Update:</strong> ${finvizDate}</div><div></div>
            <div><strong>Score:</strong> ${score}</div><div></div>
        </div>
    `;
}