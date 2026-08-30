const CALC_STEPS = [
    { key: "short", label: "Short-Strategie" },
    { key: "metrics", label: "Update-Metrics" }
    // später: { key: "agg", label: "Aggregationen" }
    // später: { key: "market", label: "Marktstruktur" }
];


export async function renderControlTiles() {
    const root = document.getElementById("control-center-root");

    root.insertAdjacentHTML("beforebegin", `
        <div id="log-modal" class="log-modal hidden">
            <div class="log-modal-content">
                <h3 id="log-title"></h3>
                <pre id="log-body"></pre>
                <button id="log-close">Schließen</button>
            </div>
        </div>
    `);

    root.innerHTML = `
        ${tile("downloads", "📥", "Yahoo-Downloads")}
        ${tile("calculations", "🧮", "Berechnungen")}
        ${tile("checks", "🔍", "Prüfungen")}
    `;

    setupTileEvents();

    // 🔥 Persistenten Status laden
    await loadPersistedStatus();
}


function tile(key, icon, title) {
    const isCalc = key === "calculations";
    const isDownloads = key === "downloads";

    return `
        <div class="control-tile" id="tile-${key}">
            <div class="tile-header">
                <span class="tile-icon">${icon}</span>
                <span class="tile-title">${title}</span>
            </div>

            <div class="tile-status" id="status-${key}">Bereit</div>

            <div class="tile-progress">
                <div class="tile-progress-bar" id="progress-${key}"></div>
            </div>

            ${key === "checks" ? `
                <div class="tile-results" id="results-checks"></div>
            ` : ""}

            ${isCalc ? `
                <div class="tile-steps" id="steps-${key}">
                    ${CALC_STEPS.map(s => `
                        <div class="tile-step" id="step-${s.key}">
                            <span class="step-label">${s.label}</span>
                            <span class="step-status" id="step-status-${s.key}">–</span>
                        </div>
                    `).join("")}
                </div>
            ` : ""}

            ${isDownloads ? `
                <div class="tile-results" id="results-downloads"></div>
            ` : ""}

            <div class="tile-meta">
                <div id="last-${key}">Letzter Lauf: –</div>
                <div id="duration-${key}">Dauer: –</div>
            </div>
        </div>
    `;
}



function setupTileEvents() {
    ["downloads", "calculations", "checks"].forEach(key => {
        document.getElementById(`tile-${key}`).addEventListener("click", () => {
            if (key !== "downloads") {
                runTileProcess(key);
            }
        });
    });

    
}


function openLogModal(title, body) {
    document.getElementById("log-title").textContent = title;
    document.getElementById("log-body").textContent = body;
    document.getElementById("log-modal").classList.remove("hidden");
}

document.addEventListener("click", (e) => {
    if (e.target.id === "log-close") {
        document.getElementById("log-modal").classList.add("hidden");
    }
});


async function runTileProcess(key) {
    updateTile(key, { status: "running", progress: 0 });

    // simulateProgress nur für calculations & checks
    if (key !== "downloads") {
        simulateProgress(key);
    }

    const startTime = Date.now();   // ⏱️ Startzeit für ALLE Tiles

    try {
        let response;

        //if (key === "downloads") {
        //    response = await runDownloads();   // SSE übernimmt Fortschritt
        //}

        if (key === "calculations") {
            response = await triggerCalculation();
        }

        if (key === "checks") {
            response = await runChecks();
        }

        // Falls die Funktion keine Dauer liefert → selbst berechnen
        const endTime = Date.now();
        const durationMs = endTime - startTime;
        const duration = response?.duration ?? formatDuration(durationMs);

                updateTile(key, {
            status: "success",
            progress: 100,
            lastRun: new Date(),
            duration
        });

        // 🔥 Status speichern
        if (key !== "downloads") {
            await saveTileStatus(key, {
                status: "success",
                lastRun: new Date(),
                duration,
                ...(key === "checks" ? { sections: response.sections } : {}),
                ...(key !== "checks" ? { details: response.details ?? {} } : {})
            });
        }


    } catch (err) {
        updateTile(key, {
            status: "error",
            progress: 100,
            lastRun: new Date(),
            duration: "Fehler"
        });

        if (key !== "downloads") {
            await saveTileStatus(key, {
                status: "error",
                lastRun: new Date(),
                duration: "Fehler"
            });
        }

    }
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}


function updateStepStatus(stepKey, status) {
    const el = document.getElementById(`step-status-${stepKey}`);
    el.textContent = status === "pending" ? "–" :
                     status === "running" ? "⏳" :
                     status === "success" ? "✔️" :
                     status === "error" ? "❌" : status;

    el.className = `step-status ${status}`;
}


async function triggerCalculation() {
    const start = performance.now();

    // Schritt 1: Short-Strategie
    updateStepStatus("short", "running");
    await runShortStrategy();
    updateStepStatus("short", "success");
    updateTile("calculations", { progress: 50 });

    // Schritt 2: Update-Metrics
    updateStepStatus("metrics", "running");
    await runUpdateMetrics();
    updateStepStatus("metrics", "success");
    updateTile("calculations", { progress: 100 });

    const end = performance.now();
    return { duration: ((end - start) / 1000).toFixed(2) + "s" };
}


// ----------------------------------------------------
// Die beiden Prozessfunktionen kommen DIREKT hier drunter
// ----------------------------------------------------

async function runShortStrategy() {
    console.log("Short-Strategie gestartet...");

    const res = await fetch("http://localhost:4000/api/short-strategy-1/update-short-strategy");

    if (!res.ok) {
        throw new Error(await res.text());
    }

    return await res.text();
}


async function runUpdateMetrics() {
    console.log("Update-Metrics gestartet...");

    const res = await fetch("http://localhost:4000/api/calculations/update-metrics");

    if (!res.ok) {
        throw new Error(await res.text());
    }

    return await res.text();
}

// Downloads

async function runIndexHistory() {
    updateTile("downloads", { status: "running", progress: 0 });

    return new Promise((resolve, reject) => {
        const evtSource = new EventSource("http://localhost:4000/api/downloads/stream");

        evtSource.addEventListener("progress", (e) => {
            const data = JSON.parse(e.data);
            const percent = data.total > 0
                ? Math.round((data.current / data.total) * 100)
                : 0;

            updateTile("downloads", {
                progress: percent,
                status: `Lade ${data.current}/${data.total} (${data.ticker})`
            });
        });

        evtSource.addEventListener("done", async () => {
            evtSource.close();

            await saveTileStatus("downloads", {
                IndexHistory: {
                    ok: true,
                    lastRun: new Date(),
                    duration: "–"
                }
            });

            await loadPersistedStatus();
            resolve();
        });
    });
}


async function runDailyHistory() {
    updateTile("downloads", { status: "running", progress: 0 });

    return new Promise((resolve) => {
        const evtSource = new EventSource("http://localhost:4000/api/downloads/stream-daily");

        evtSource.addEventListener("progress", (e) => {
            const data = JSON.parse(e.data);
            const percent = Math.round((data.current / data.total) * 100);

            updateTile("downloads", {
                progress: percent,
                status: `Lade ${data.current}/${data.total} (${data.ticker})`
            });
        });

        evtSource.addEventListener("done", async () => {
            evtSource.close();

            await saveTileStatus("downloads", {
                DailyHistory: {
                    ok: true,
                    lastRun: new Date(),
                    duration: "–"
                }
            });

            await loadPersistedStatus();
            resolve();
        });
    });
}



function renderDownloadsStatus(downloads) {
    const root = document.getElementById("results-downloads");
    if (!root) return;

    const rows = [
        { key: "IndexHistory", label: "IndexHistory" },
        { key: "DailyHistory", label: "DailyHistory" }
    ];

    root.innerHTML = `
        <table class="check-table">
            <thead>
                <tr>
                    <th>Tabelle</th>
                    <th>Status</th>
                    <th>Letzter Lauf</th>
                    <th>Dauer</th>
                    <th>Aktion</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => {
                    const s = downloads[r.key] || {};
                    const ok = s.ok === true;

                    return `
                        <tr class="${ok ? "success" : (s.ok === false ? "error" : "")}">
                            <td>${r.label}</td>
                            <td>${s.ok === undefined ? "–" : (ok ? "✔️" : "❌")}</td>
                            <td>${s.lastRun ? formatDateTimeShort(s.lastRun.replace("T", " ").slice(0,16)) : "–"}</td>
                            <td>${s.duration || "–"}</td>
                            <td class="download-action" data-key="${r.key}" style="cursor: pointer;">📥</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    // 🔥 Korrigierter Block mit Event-Delegation am Root-Element
    // Entfernt alte Listener implizit und verhindert den "Dauerschleifen-Effekt"
    root.onclick = (e) => {
        const el = e.target.closest(".download-action");
        if (!el) return;

        e.stopPropagation(); // Verhindert Klick auf die dahinterliegende Kachel
        const key = el.dataset.key;

        // Visuelle Sperre: Verhindert, dass der Stream 4-fach gestartet wird
        if (el.style.opacity === "0.5") return; 
        el.style.opacity = "0.5";

        if (key === "IndexHistory") {
            runIndexHistory().finally(() => el.style.opacity = "1");
        }
        if (key === "DailyHistory") {
            runDailyHistory().finally(() => el.style.opacity = "1");
        }
    };
}
// Prüfungen
async function runChecks() {
    console.log("Prüfungen gestartet...");

    const res = await fetch("http://localhost:4000/api/checks/all");

    if (!res.ok) {
        openLogModal("Prüfungen – Fehler", await res.text());
        throw new Error("Fehler bei Prüfungen");
    }

    const json = await res.json();

    // ----------------------------------------------------
    // 1) Neue Struktur (sections)
    // ----------------------------------------------------
    const sections = {
        finviz: {
            title: "Finviz-Daten",
            status: "success",
            items: []
        },
        yahoo: {
            title: "Yahoo-Daten + Berechnungen",
            status: "success",
            items: []
        },
        journal: {
            title: "Trading-Journal",
            status: "success",
            items: []
        }
    };

    for (const db of json.results) {
        const dbName = db.database.toLowerCase();

        let target = null;
        if (dbName.includes("finviz")) target = sections.finviz;
        if (dbName.includes("yahoo")) target = sections.yahoo;
        if (dbName.includes("journal")) target = sections.journal;

        if (!target) continue;

        for (const t of db.tables) {
            target.items.push({
                name: t.table,
                status: t.ok ? "success" : "error",
                lastDateStr: t.lastDateStr ?? null,
                countAtLastDate: t.countAtLastDate ?? null,
                isValidation: t.details !== undefined,
                details: t.details ?? null
            });

            if (!t.ok) {
                target.status = "error";
            }
        }
    }

    // ----------------------------------------------------
    // 2) Ergebnisse anzeigen
    // ----------------------------------------------------
    renderCheckSections(sections);

    // ----------------------------------------------------
    // 3) Fehler-Popup nur bei Fehlern
    // ----------------------------------------------------
    if (!json.ok) {
        openLogModal("Prüfungen – Fehler", JSON.stringify(json, null, 2));
    }

    return { sections };
}


function formatSqlDate(date) {
    const d = new Date(date);
    return d.getFullYear() + "-" +
           String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
}

function renderCheckResults(data) {
    const root = document.getElementById("results-checks");
    if (!root) return;

    root.innerHTML = data.results.map(db => `
        <div class="check-db-block">
            <div class="check-db-title">${db.database}</div>
            <div class="check-table-list">
                ${db.tables.map(t => `
                    <div class="check-table-row ${t.ok ? "ok" : "fail"}">
                        <span>${t.table}</span>
                        <span>${t.ok ? "✔️" : "❌"}</span>
                    </div>

                    ${t.ok && t.lastDate ? `
                        <div class="check-table-details">
                            <div>Datum: ${t.lastDateStr ?? "–"}</div>
                            <div>Gesamt: ${t.totalCount}</div>
                            <div>Letzter Tag: ${t.countAtLastDate}</div>
                        </div>
                    ` : ""}
                `).join("")}
            </div>
        </div>
    `).join("");
}


function simulateProgress(key) {
    let p = 0;
    const interval = setInterval(() => {
        p += 8;
        updateTile(key, { progress: p });
        if (p >= 90) clearInterval(interval);
    }, 120);
}

function updateTile(key, data) {
    const tile = document.getElementById(`tile-${key}`);
    const status = document.getElementById(`status-${key}`);
    const progress = document.getElementById(`progress-${key}`);

    if (data.status) {
        tile.className = `control-tile ${data.status}`;

        // ❗ Checks-Kachel NICHT überschreiben
        if (key !== "checks") {
            status.textContent = data.status;
        }
    }


    if (data.progress !== undefined) {
        progress.style.width = data.progress + "%";
    }

    if (data.lastRun) {
        document.getElementById(`last-${key}`).textContent =
            "Letzter Lauf: " + data.lastRun.toLocaleString();
    }

    if (data.duration) {
        document.getElementById(`duration-${key}`).textContent =
            "Dauer: " + data.duration;
    }
}

async function loadPersistedStatus() {
    try {
        const res = await fetch("/api/cockpit/status");
        if (!res.ok) return;

        const status = await res.json();

        // Downloads
        if (status.downloads) {
            renderDownloadsStatus(status.downloads);
        }

        // Calculations
        if (status.calculations) {
            updateTile("calculations", status.calculations);
        }

        // Checks
        if (status.checks) {
            updateTile("checks", status.checks);

            if (status.checks.sections) {
                renderCheckSections(status.checks.sections);
            }
        }

    } catch (err) {
        console.warn("Status konnte nicht geladen werden:", err);
    }
}


async function saveTileStatus(tile, payload) {
    try {
        await fetch(`/api/cockpit/status/${tile}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.warn("Status konnte nicht gespeichert werden:", err);
    }
}
function formatDateTimeShort(str) {
    if (!str) return "–";

    // Beispiel: "2026-04-17 20:17:11"
    const [date, time] = str.split(" ");
    if (!time) return date;

    const [hh, mm] = time.split(":");
    return `${date} ${hh}:${mm}`;
}

function renderCheckSections(sections) {
    const overall = computeOverallCheckStatus(sections);
    updateOverallCheckStatus(overall, sections);
    renderMiniHeatmap(sections);   // 🔥 HIER MUSS ES HIN


    const root = document.getElementById("results-checks");
    if (!root) return;

    const ICONS = {
        finviz: "📊",
        yahoo: "📈",
        journal: "📘"
    };

    root.innerHTML = Object.entries(sections).map(([key, sec]) => `
        <div class="check-section">
            <div class="check-section-title">
            <span class="check-icon">${ICONS[key]}</span> ${sec.title}
        </div>

            <div class="check-section-box ${sec.status}">
                <table class="check-table">
                    <thead>
                        <tr>
                            <th>Tabelle</th>
                            <th>Status</th>
                            <th>Letztes Datum</th>
                            <th>Daten</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sec.items.map(item => `
                            <tr class="${item.status}">
                                <td>${item.name}</td>
                                <td>${item.status === "success" ? "✔️" : "❌"}</td>
                                <td>${item.isValidation ? "–" : formatDateTimeShort(item.lastDateStr)}</td>
                                <td>
                                    ${item.isValidation
                                        ? (item.details ? item.details.join(", ") : "–")
                                        : (item.countAtLastDate ?? "–")
                                    }
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `).join("");
}
function normalizeDateStr(str) {
    if (!str) return null;
    // reicht hier, weil deine Strings mit Datum anfangen
    return str.slice(0, 10); // "2026-04-17"
}

function updateOverallCheckStatus(status, sections) {
    const tile = document.getElementById("tile-checks");
    tile.dataset.overall = status;

    const statusEl = document.getElementById("status-checks");
    if (!statusEl) return;

    // Badge-Klasse bestimmen
    const badgeClass =
        status === "green" ? "badge-green" :
        status === "yellow" ? "badge-yellow" :
        "badge-red";

    // Badge + Heatmap einfügen
    statusEl.innerHTML = `
        <span class="badge ${badgeClass}">
            ${status === "green" ? "OK" : status === "yellow" ? "WARN" : "ERROR"}
        </span>
        <span class="mini-heatmap"></span>
    `;

    renderMiniHeatmap(sections);
}

function computeOverallCheckStatus(sections) {
    const relevant = [
        ...sections.finviz.items,
        ...sections.yahoo.items
    ];

    let errors = 0;
    let dateSet = new Set();

    for (const item of relevant) {
        if (item.status !== "success") {
            errors++;
        }
        const norm = normalizeDateStr(item.lastDateStr);
        if (norm) {
            dateSet.add(norm);
        }
    }

    const dateMismatch = dateSet.size > 1 ? dateSet.size - 1 : 0;

    if (errors >= 2 || dateMismatch >= 2) return "red";
    if (errors >= 1 || dateMismatch >= 1) return "yellow";
    return "green";
}

function renderMiniHeatmap(sections) {
    const root = document.querySelector("#tile-checks .mini-heatmap");
    if (!root) return;

    const relevant = [
        ...sections.finviz.items,
        ...sections.yahoo.items
    ];

    const dates = relevant
        .map(i => normalizeDateStr(i.lastDateStr))
        .filter(Boolean);

    const mostCommonDate = dates.sort((a, b) =>
        dates.filter(v => v === a).length - dates.filter(v => v === b).length
    ).pop();

    root.innerHTML = relevant.map(item => {
        let cls = "hm-success";

        if (item.status !== "success") {
            cls = "hm-error";
        } else if (normalizeDateStr(item.lastDateStr) !== mostCommonDate) {
            cls = "hm-warning";
        }

        return `<span class="hm ${cls}"></span>`;
    }).join("");
}



