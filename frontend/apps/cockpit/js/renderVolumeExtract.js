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

    renderVolumeExtract(sorted);
}

export function renderVolumeExtract(list, targetId = "col-1") {
    const container = document.getElementById(targetId);
    if (!container) return;

    const filtered = applyExtractFilters(list);

    // ⭐ 8 Spalten wie col‑1
    const cols = "0.5fr 0.8fr 0.8fr 0.8fr 1.5fr 1.1fr 1fr 1fr";

    const getIcon = (key) => {
        const cfg = GlobalState.get("sortConfig");
        if (cfg.key !== key) return '<span style="color:#444; margin-left:3px;">↕</span>';
        return cfg.direction === "desc"
            ? '<span style="color:#ffa500; margin-left:3px;">↓</span>'
            : '<span style="color:#ffa500; margin-left:3px;">↑</span>';
    };

    function applyExtractFilters(list) {

        const topTurnover = [...list]
            .sort((a, b) => b.turnover - a.turnover)
            .slice(0, 40);

        const topVolume = [...list]
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 40);

        const topRatio = [...list]
            .sort((a, b) => b.ratio - a.ratio)
            .slice(0, 40);

        // ⭐ Schnittmenge der drei Top‑25‑Listen
        const intersection = topTurnover.filter(a =>
            topVolume.some(b => b.ticker === a.ticker) &&
            topRatio.some(c => c.ticker === a.ticker)
        );

        // ⭐ Strength‑Filter:
        // C2C >= 0  UND  Retracement >= -25%
        const strongOnly = intersection.filter(item => {

            // Close-to-Close %
            const c2c = item.prevClose
                ? ((item.close - item.prevClose) / item.prevClose) * 100
                : null;

            // Retracement negativ
            const retr = item.high
                ? ((item.close / item.high) - 1) * 100
                : null;

            return (
                c2c !== null && c2c >= 0 &&   // kein negativer C2C
                retr !== null && retr >= -25 // nur Weiß + Gelb
            );
        });

        return strongOnly;
    }


    container.innerHTML = `
        <div id="volume-table-container" style="font-family: sans-serif; position: relative;">
            <div style="position: sticky; top: 0; z-index: 100; background: #121212; padding-top: 20px;">
                <h2 style="font-size: 1rem; color: #ffa500; margin: 0; padding: 0 5px 8px 5px;">
                    Extract <span style="color: #58a6ff; font-size: 0.7rem;">(Min. 10M Umsatz)</span>
                </h2>
                
                <div style="display:grid; grid-template-columns:${cols}; font-weight:bold; color:#888; border-bottom:1px solid #444; padding:8px 5px; font-size: 0.85rem; background: #1a1a1a;">
                    <div>R#</div>
                    <div style="cursor:pointer; color:#58a6ff;" data-sort="ticker">Ticker ${getIcon("ticker")}</div>
                    <div style="text-align:right; cursor:pointer; color:#58a6ff;" data-sort="close">Preis ${getIcon("close")}</div>
                    <div style="text-align:right; cursor:pointer; color:#58a6ff;" data-sort="ratio">Ratio ${getIcon("ratio")}</div>
                    <div style="text-align:right; cursor:pointer; color:#58a6ff;" data-sort="volume">Volumen ${getIcon("volume")}</div>
                    <div style="text-align:right; cursor:pointer; color:#58a6ff;" data-sort="turnover">Umsatz ${getIcon("turnover")}</div>

                    <!-- ⭐ Retracement -->
                    <div style="text-align:right;">Retr.</div>

                    <!-- ⭐ Close-to-Close -->
                    <div style="text-align:right;">C2C%</div>
                </div>
            </div>

            <div id="volume-rows" style="background: #121212;">
                ${filtered.map((item, idx) => {

                    // ⭐ Retracement negativ
                    const retr = item.high
                        ? (((item.close / item.high) - 1) * 100).toFixed(1)
                        : null;

                    let retrColor = "#fff";
                    if (retr !== null) {
                        const r = parseFloat(retr);
                        if (r <= -50) retrColor = "#ff4444";
                        else if (r <= -25) retrColor = "orange";
                        else if (r <= -10) retrColor = "yellow";
                    }

                    // ⭐ Close-to-Close %
                    const c2c = item.prevClose
                        ? (((item.close - item.prevClose) / item.prevClose) * 100).toFixed(1)
                        : null;

                    const c2cColor =
                        c2c === null ? "#888" :
                        c2c >= 0 ? "#00ff00" : "#ff4444";

                    return `
                        <div style="display:grid; grid-template-columns:${cols}; border-bottom:1px solid #222; padding:6px 5px; color:#fff; font-size: 0.9rem;">
                            <div style="color:#ffa500; font-size: 0.8rem;">${idx + 1}.</div>
                            <div style="font-weight:bold;">${item.ticker}</div>
                            <div style="text-align:right;">${fmt.price(item.close)} $</div>
                            <div style="text-align:right; color:#00ff00;">${item.ratio?.toFixed(1) || "0"}x</div>
                            <div style="text-align:right; color:#aaa;">${fmt.num(item.volume)}</div>
                            <div style="text-align:right; color:#58a6ff;">${Math.round(item.turnover/1_000_000)}M $</div>

                            <!-- Retracement -->
                            <div style="text-align:right; color:${retrColor};">
                                ${retr !== null ? retr + "%" : "-"}
                            </div>

                            <!-- Close-to-Close -->
                            <div style="text-align:right; color:${c2cColor};">
                                ${c2c !== null ? c2c + "%" : "-"}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>`;

    container.querySelectorAll("[data-sort]").forEach(el => {
        el.addEventListener("click", () => handleSort(el.dataset.sort));
    });
}
