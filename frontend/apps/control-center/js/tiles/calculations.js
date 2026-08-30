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
        { key: "RS_Indices", label: "RS Indices JSON", action: "rsindices" }, // NEU
        { key: "Signals", label: "Signals Engine", action: "signals" },
        { key: "SparkSignals", label: "Spark-Signale (DB)", action: "spark" }, // NEU
        { key: "Stage3Topping", label: "Stage3 Topping Writer", action: "stage3topping" },
        { key: "Metrics", label: "Update-Metrics", action: "metrics" },
        { key: "InsideDay52W", label: "InsideDay52W Writer", action: "insideday52w" },
       
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
                            <td class="calc-action" data-action="${r.action}"><i class="fas fa-cog"></i></td>

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

        // Zahnrad aktiv setzen
        el.classList.add("running");
        el.style.opacity = "0.5";

        try {
            const actions = {
                
                "metrics": runMetricsAction,
                "rssectors": runRsSectorsWriter,
                "rsindustries": runRsIndustriesWriter,
                "rsstocks": runRsStocksWriter,
                "rsetfs": runRsEtfsWriter,
                "rsindices": runRsIndicesWriter, // NEU
                "signals": runSignalsEngine,
                "spark": runSparkSignalWriter,
                "stage3topping": runStage3ToppingWriter,
                "insideday52w": runInsideDay52WWriter

            };

            if (actions[action]) await actions[action]();
        } catch (err) {
            console.error("Fehler beim Prozess:", err);
        } finally {
            // Zahnrad wieder deaktivieren
            el.classList.remove("running");
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



async function runMetricsAction() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/data/metrics/run", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Unbekannter Fehler");

        await saveTileStatus("calculations", {
            Metrics: { 
                status: "success", 
                lastRun: new Date(), 
                duration: ((performance.now() - start) / 1000).toFixed(1) + "s" 
            }
        });
    } catch (err) {
        console.error("Fehler bei Metrics:", err);
        await saveTileStatus("calculations", { 
            Metrics: { 
                status: "error", 
                lastRun: new Date(), 
                duration: "–" 
            } 
        });
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

// Neue Async-Funktion am Ende der Action-Funktionen:
async function runRsIndicesWriter() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/rs/write-indices");
        const data = await res.json();
        await saveTileStatus("calculations", {
            RS_Indices: { 
                status: data.success ? "success" : "error", 
                lastRun: new Date(), 
                duration: ((performance.now() - start) / 1000).toFixed(1) + "s" 
            }
        });
    } catch (err) {
        await saveTileStatus("calculations", { 
            RS_Indices: { 
                status: "error", 
                lastRun: new Date(), 
                duration: "–" 
            } 
        });
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

// In deiner calculations.js:
async function runSparkSignalWriter() {
    // 1. Check beim Backend
    const response = await fetch("http://localhost:4000/api/system/check-spark-status");
    const data = await response.json();

    // 2. Wächter-Logik
    if (data.isDone) {
        await saveTileStatus("calculations", {
            SparkSignals: {
                status: "success",
                lastRun: new Date(),
                duration: "0s"
            }
        });
        return;
    }

    // 3. Writer starten
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/signals/write-spark-to-db");
        const result = await res.json();

        await saveTileStatus("calculations", {
            SparkSignals: {
                status: result.success ? "success" : "error",
                lastRun: new Date(),
                duration: ((performance.now() - start) / 1000).toFixed(1) + "s"
            }
        });

    } catch (err) {
        await saveTileStatus("calculations", {
            SparkSignals: {
                status: "error",
                lastRun: new Date(),
                duration: "–"
            }
        });
    }
}

async function runStage3ToppingWriter() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/strategy/write-stage3-topping");
        const data = await res.json();

        await saveTileStatus("calculations", {
            Stage3Topping: {
                status: data.success ? "success" : "error",
                lastRun: new Date(),
                duration: ((performance.now() - start) / 1000).toFixed(1) + "s"
            }
        });

    } catch (err) {
        await saveTileStatus("calculations", {
            Stage3Topping: {
                status: "error",
                lastRun: new Date(),
                duration: "–"
            }
        });
    }
}

async function runInsideDay52WWriter() {
    const start = performance.now();
    try {
        const res = await fetch("http://localhost:4000/api/strategy/insideDay52wWriter");
        const data = await res.json();

        await saveTileStatus("calculations", {
            InsideDay52W: {
                status: data.error ? "error" : "success",
                lastRun: new Date(),
                duration: ((performance.now() - start) / 1000).toFixed(1) + "s"
            }
        });

    } catch (err) {
        await saveTileStatus("calculations", {
            InsideDay52W: {
                status: "error",
                lastRun: new Date(),
                duration: "–"
            }
        });
    }
}
