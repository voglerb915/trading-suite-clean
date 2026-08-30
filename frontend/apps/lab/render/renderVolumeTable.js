import GlobalState from "../../../shared/state/globalState.js";
import { sortBy } from "../../../shared/utils/sort.js";
import { fmt } from "../../../shared/utils/format.js";

export function handleSort(key) {
    const config = GlobalState.get("sortConfig");

    const newDirection =
        config.key === key && config.direction === "desc"
            ? "asc"
            : "desc";

    const sorted = sortBy(GlobalState.get("volumeData"), key, newDirection);

    GlobalState.update({
        sortConfig: { key, direction: newDirection },
        volumeData: sorted
    });

    renderVolumeTable(sorted);
}

export function renderVolumeTable(list, targetId = "col-1") {
    const container = document.getElementById(targetId);
    if (!container) return;

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
                Huge Volume <span class="subtitle">(Min. 10M Umsatz)</span>
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
            ${list.map((item, idx) => {
                const retr = item.high
                    ? (((item.close / item.high) - 1) * 100).toFixed(1)
                    : null;

                let retrColor = "white";
                if (retr !== null) {
                    const r = parseFloat(retr);
                    if (r <= -50) retrColor = "red";
                    else if (r <= -25) retrColor = "orange";
                    else if (r <= -10) retrColor = "yellow";
                }

                const c2c = item.prevClose
                    ? (((item.close - item.prevClose) / item.prevClose) * 100).toFixed(1)
                    : null;

                const c2cColor =
                    c2c === null ? "#888" :
                    c2c >= 0 ? "#00ff00" : "#ff4444";

                return `
                    <div class="vol-grid volume-data-row">
                        <div class="index">${idx + 1}.</div>
                        <div class="ticker">${item.ticker}</div>
                        <div class="text-right">${fmt.price(item.close)} $</div>
                        <div class="text-right ratio">${item.ratio?.toFixed(1) || "0"}x</div>
                        <div class="text-right">${fmt.num(item.volume)}</div>
                        <div class="text-right turnover">${Math.round(item.turnover / 1_000_000)}M $</div>
                        <div class="text-right" style="color:${retrColor}">
                            ${retr !== null ? retr + "%" : "-"}
                        </div>
                        <div class="text-right" style="color:${c2cColor}">
                            ${c2c !== null ? c2c + "%" : "-"}
                        </div>
                    </div>`;
            }).join('')}
        </div>`;

    container.querySelectorAll("[data-sort]").forEach(el => {
        el.addEventListener("click", () => handleSort(el.dataset.sort));
    });
}
