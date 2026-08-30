import GlobalState from "../../../shared/state/globalState.js";
import { sortBy } from "../../../shared/utils/sort.js";
import { fmt } from "../../../shared/utils/format.js";

// Hilfsfunktion für die Filterung
function applyExtractFilters(list) {
    const topTurnover = [...list].sort((a, b) => b.turnover - a.turnover).slice(0, 40);
    const topVolume = [...list].sort((a, b) => b.volume - a.volume).slice(0, 40);
    const topRatio = [...list].sort((a, b) => b.ratio - a.ratio).slice(0, 40);

    const intersection = topTurnover.filter(a =>
        topVolume.some(b => b.ticker === a.ticker) &&
        topRatio.some(c => c.ticker === a.ticker)
    );

    return intersection.filter(item => {
        const c2c = item.prevClose ? ((item.close - item.prevClose) / item.prevClose) * 100 : null;
        const retr = item.high ? ((item.close / item.high) - 1) * 100 : null;
        return (c2c !== null && c2c >= 0 && retr !== null && retr >= -25);
    });
}

export function handleSort(key) {
    const config = GlobalState.get("sortConfig");
    const newDirection = config.key === key && config.direction === "desc" ? "asc" : "desc";
    
    // Wir sortieren die Rohdaten aus dem State
    const sorted = sortBy(GlobalState.get("volumeData"), key, newDirection);

    GlobalState.update({
        sortConfig: { key, direction: newDirection },
        volumeData: sorted
    });

    // WICHTIG: Hier wird das Rerender mit der neuen Liste getriggert
    renderVolumeExtract(sorted);
}

export function renderVolumeExtract(list) {
    const container = document.getElementById("col-2");
    if (!container) return;

    const filtered = applyExtractFilters(list);

    const getIcon = (key) => {
        const cfg = GlobalState.get("sortConfig");
        return cfg.key !== key
            ? '<span class="sort-icon inactive">↕</span>'
            : (cfg.direction === "desc"
                ? '<span class="sort-icon active">↓</span>'
                : '<span class="sort-icon active">↑</span>');
    };

    container.innerHTML = `
        <div class="volume-sticky-wrapper">
            <h2 class="section-title">
                Extract <span class="subtitle">(Min. 10M Umsatz)</span>
            </h2>

            <div class="vol-grid volume-header-row">
                <div>R#</div>
                <div class="sortable" data-sort="ticker">Ticker ${getIcon("ticker")}</div>
                <div class="sortable text-right" data-sort="close">Preis ${getIcon("close")}</div>
                <div class="sortable text-right" data-sort="ratio">Ratio ${getIcon("ratio")}</div>
                <div class="sortable text-right" data-sort="volume">Volumen ${getIcon("volume")}</div>
                <div class="sortable text-right" data-sort="turnover">Umsatz ${getIcon("turnover")}</div>
                <div class="text-right">Retr.</div>
                <div class="text-right">C2C%</div>
            </div>
        </div>

        <div class="volume-rows-container">
            ${filtered.map((item, idx) => {
                const retr = item.high
                    ? (((item.close / item.high) - 1) * 100).toFixed(1)
                    : null;

                const c2c = item.prevClose
                    ? (((item.close - item.prevClose) / item.prevClose) * 100).toFixed(1)
                    : null;

                const retrColor =
                    retr <= -50 ? "red" :
                    retr <= -25 ? "orange" :
                    retr <= -10 ? "yellow" : "white";

                const c2cColor =
                    c2c === null ? "#888" :
                    c2c >= 0 ? "#00ff00" : "#ff4444";

                return `
                    <div class="vol-grid volume-data-row">
                        <div class="index">${idx + 1}.</div>
                        <div class="ticker">${item.ticker}</div>
                        <div class="text-right">${fmt.price(item.close)} $</div>
                        <div class="text-right" style="color:#00ff00">${item.ratio?.toFixed(1) || "0"}x</div>
                        <div class="text-right">${fmt.num(item.volume)}</div>
                        <div class="text-right" style="color:#58a6ff">${Math.round(item.turnover / 1_000_000)}M $</div>
                        <div class="text-right" style="color:${retrColor}">
                            ${retr !== null ? retr + "%" : "-"}
                        </div>
                        <div class="text-right" style="color:${c2cColor}">
                            ${c2c !== null ? c2c + "%" : "-"}
                        </div>
                    </div>`;
            }).join('')}
        </div>
    `;

    container.querySelectorAll(".sortable").forEach(el => {
        el.addEventListener("click", () => handleSort(el.dataset.sort));
    });
}
