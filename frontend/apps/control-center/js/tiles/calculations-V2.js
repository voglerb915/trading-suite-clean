import { updateTile, saveTileStatus, loadPersistedStatus } from "../logic.js";
import { formatTimestamp } from "../../../../shared/utils/time.js";

export function renderCalculationsTable(state = {}) {
    const root = document.getElementById("results-calculations");
    if (!root) return;

    const rows = [
        { key: "RS_Sectors", label: "RS Sectors JSON", action: "rssectors" },
        { key: "RS_Industries", label: "RS Industries JSON", action: "rsindustries" },
        { key: "RS_Stocks", label: "RS Stocks JSON", action: "rsstocks" },
        { key: "RS_ETFs", label: "RS ETFs JSON", action: "rsetfs" }, 
        { key: "Signals", label: "Signals Engine", action: "signals" },
        { key: "ShortStrategy", label: "Short-Strategie", action: "short" },
        { key: "Metrics", label: "Update-Metrics", action: "metrics" }
    ];

    root.innerHTML = `
        <table class="downloads-table">
            <thead>
                <tr>
                    <th>Berechnung</th>
                    <th style="text-align: center;">Status</th>
                    <th style="text-align: center;">Letzter Lauf</th>
                    <th style="text-align: center;">Dauer</th>
                    <th style="text-align: center;">Aktion</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => {
                    const s = state[r.key] || {};
                    const ok = s.ok === true || s.status === "success";
                    const isError = s.ok === false || s.status === "error";
                    return `
                        <tr class="${ok ? "success" : (isError ? "error" : "")}">
                            <td>${r.label}</td>
                            <td>${ok ? "✔️" : (isError ? "❌" : "–")}</td>
                            <td>${s.lastRun ? formatTimestamp(s.lastRun) : "–"}</td>
                            <td>${s.duration || "–"}</td>
                            <td class="calc-action" data-action="${r.action}" style="cursor: pointer;">⚙️</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    root.onclick = async (e) => {
        const el = e.target.closest(".calc-action");
        if (!el) return;

        const action = el.dataset.action;
        el.style.opacity = "0.5";

        try {
            const actions = {
                "short": runShortStrategyAction,
                "metrics": runMetricsAction,
                "rssectors": runRsSectorsWriter,
                "rsindustries": runRsIndustriesWriter,
                "rsstocks": runRsStocksWriter,
                "rsetfs": runRsEtfsWriter,
                "signals": runSignalsEngine
            };

            if (actions[action]) await actions[action]();
        } catch (err) {
            console.error("Fehler beim Prozess:", err);
        } finally {
            el.style.opacity = "1";
            await loadPersistedStatus();
            renderCalculationsTable(window.__persistedState?.calculations || {});
        }
    };
}

/* ============================================================
   ACTION FUNKTIONEN
============================================================ */

async function runSignalsEngine() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/signals/run-engine");
        const data = await res.json();
        await saveTileStatus("calculations", {
            Signals: {
                status: data.success ? "success" : "error",
                lastRun: new Date(),
                duration: ((performance.now() - start) / 1000).toFixed(1) + "s"
            }
        });
    } catch (err) {
        await saveTileStatus("calculations", {
            Signals: { status: "error", lastRun: new Date(), duration: "–" }
        });
    }
}

async function runShortStrategyAction() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/strategy/short-1/update-short-strategy");
        if (!res.ok) throw new Error();
        await saveTileStatus("calculations", {
            ShortStrategy: { status: "success", lastRun: new Date(), duration: ((performance.now() - start) / 1000).toFixed(1) + "s" }
        });
    } catch (err) {
        await saveTileStatus("calculations", { ShortStrategy: { status: "error", lastRun: new Date(), duration: "–" } });
    }
}

async function runMetricsAction() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/data/volume-metrics");
        if (!res.ok) throw new Error();
        await saveTileStatus("calculations", {
            Metrics: { status: "success", lastRun: new Date(), duration: ((performance.now() - start) / 1000).toFixed(1) + "s" }
        });
    } catch (err) {
        await saveTileStatus("calculations", { Metrics: { status: "error", lastRun: new Date(), duration: "–" } });
    }
}

async function runRsSectorsWriter() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/rs/write-sectors");
        const data = await res.json();
        await saveTileStatus("calculations", {
            RS_Sectors: { status: data.success ? "success" : "error", lastRun: new Date(), duration: ((performance.now() - start) / 1000).toFixed(1) + "s" }
        });
    } catch (err) {
        await saveTileStatus("calculations", { RS_Sectors: { status: "error", lastRun: new Date(), duration: "–" } });
    }
}

async function runRsIndustriesWriter() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/rs/write-industries");
        const data = await res.json();
        await saveTileStatus("calculations", {
            RS_Industries: { status: data.success ? "success" : "error", lastRun: new Date(), duration: ((performance.now() - start) / 1000).toFixed(1) + "s" }
        });
    } catch (err) {
        await saveTileStatus("calculations", { RS_Industries: { status: "error", lastRun: new Date(), duration: "–" } });
    }
}

async function runRsStocksWriter() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/rs/write-stocks");
        const data = await res.json();
        await saveTileStatus("calculations", {
            RS_Stocks: { status: data.success ? "success" : "error", lastRun: new Date(), duration: ((performance.now() - start) / 1000).toFixed(1) + "s" }
        });
    } catch (err) {
        await saveTileStatus("calculations", { RS_Stocks: { status: "error", lastRun: new Date(), duration: "–" } });
    }
}

async function runRsEtfsWriter() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/rs/write-etfs");
        const data = await res.json();
        await saveTileStatus("calculations", {
            RS_ETFs: { status: data.success ? "success" : "error", lastRun: new Date(), duration: ((performance.now() - start) / 1000).toFixed(1) + "s" }
        });
    } catch (err) {
        await saveTileStatus("calculations", { RS_ETFs: { status: "error", lastRun: new Date(), duration: "–" } });
    }
}