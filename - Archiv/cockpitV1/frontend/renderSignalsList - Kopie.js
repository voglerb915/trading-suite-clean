import { sectorClasses } from "../../../../shared/logic/sectorColors.js";

export function renderSignalsList(signals = [], state = {}) {
    console.log("DEBUG: renderSignalsList wurde aufgerufen. Signale erhalten:", signals);
    const listEl = document.getElementById("tools-tab-content");
    const pillContainer = document.getElementById("tools-pill-container");

    if (!listEl) return;

    // 🟢 Pille aktualisieren
    if (pillContainer) {
        pillContainer.innerHTML = `<span class="pill pill-small">${signals.length || 0}</span>`;
    }

    // Container leeren (sauberer als innerHTML = "")
    listEl.innerHTML = "";

    // 🟡 Keine Signale
    if (!signals || signals.length === 0) {
        listEl.innerHTML = "<p>Keine Signale verfügbar.</p>";
        return;
    }

    // 🟢 Sortierung
    const sorted = [...signals].sort(
        (a, b) => Number(a.signal_age_index) - Number(b.signal_age_index)
    );

    // 🟢 Liste als Ul-Container erstellen
    const ul = document.createElement("ul");
    ul.className = "stock-list";

    sorted.forEach(item => {
        const li = document.createElement("li");
        const sectorClass = sectorClasses[item.sector] ?? "";
        const isSelected = item.ticker === state.ticker;
        
        li.className = `stock-item ${sectorClass} ${isSelected ? "highlight-ticker" : ""}`;
        li.dataset.stock = item.ticker;

        // Bars erstellen
        const bars = [1, 2, 3, 4, 5].map(i => {
            const active = i === Number(item.signal_age_index);
            const color = active ? (item.signal_type === "LONG" ? "bg-green" : "bg-red") : "";
            return `<div class="bar bar-${i} ${color}"></div>`;
        }).join("");

        li.innerHTML = `
            <div class="stock-row-inner">
                <div class="stock-left">
                    <strong>${item.ticker ?? "—"}</strong>
                    <span class="signal-chart-icon" title="Chart öffnen">
                        <i class="fa-solid fa-chart-line"></i>
                    </span>
                    <br>
                    <span class="stock-sub">${item.sector ?? ""} | ${item.industry ?? "—"}</span>
                </div>
                <div class="stock-right signal-right">
                    <div class="phase-badge bg-${item.phase_color ?? "gray"}">
                        ${item.market_phase ?? "—"}
                    </div>
                    <div class="signal-visual">${bars}</div>
                </div>
            </div>
        `;

        // Event: Chart öffnen
        li.querySelector(".signal-chart-icon").onclick = (e) => {
            e.stopPropagation();
            if (typeof window.updateChart === "function") window.updateChart(item.ticker);
        };

        // Event: Stock Click
        li.onclick = () => {
            if (typeof window.handleStockClick === "function") window.handleStockClick(item.ticker);
        };

        ul.appendChild(li);
    });

    listEl.appendChild(ul);
}