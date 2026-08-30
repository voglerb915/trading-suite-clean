import { formatDateTimeShort, updateTile, openLogModal } from "../logic.js";

export async function runChecks() {
    console.log("Prüfungen gestartet...");

    // 🟩 1. Prüfungen ausführen (DB lesen) – Pfad an server.js angepasst
    const res = await fetch("http://localhost:4000/api/system/checks/all");

    if (!res.ok) {
        openLogModal("Prüfungen – Fehler", await res.text());
        throw new Error("Fehler bei Prüfungen");
    }

    const json = await res.json();

    // 🟩 2. Sections vorbereiten
    const sections = {
        finviz: { title: "Finviz-Daten", status: "success", items: [] },
        yahoo: { title: "Yahoo-Daten + Berechnungen", status: "success", items: [] },
        journal: { title: "Trading-Journal", status: "success", items: [] }
    };

    for (const db of json.results) {
        const dbName = db.database.toLowerCase();
        let target = null;

        if (dbName === "finviz") target = sections.finviz;
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

            if (!t.ok) target.status = "error";
        }
    }

    // 🟩 3. UI aktualisieren
    renderCheckSections(sections);

    if (!json.ok) {
        openLogModal("Prüfungen – Fehler", JSON.stringify(json, null, 2));
    }

    // 🟩 4. Gesamtstatus berechnen
    const overall = computeOverallCheckStatus(sections);

    // 🟩 5. Status in die richtige Datei schreiben (Passend zur :tile Route)
        await fetch("http://localhost:4000/api/system/cockpit/checks", { // 🟢 '/status' entfernt
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: overall,
                lastRun: new Date().toISOString(),
                duration: json.duration ?? null,
                sections
            })
        });

    return { sections };
}

export function renderCheckSections(sections) {
    const overall = computeOverallCheckStatus(sections);
    updateOverallCheckStatus(overall, sections);
    renderMiniHeatmap(sections);

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
    return str.slice(0, 10);
}

function computeOverallCheckStatus(sections) {
    const relevant = [
        ...sections.finviz.items,
        ...sections.yahoo.items
    ];

    let errors = 0;
    let dateSet = new Set();

    for (const item of relevant) {
        if (item.status !== "success") errors++;
        const norm = normalizeDateStr(item.lastDateStr);
        if (norm) dateSet.add(norm);
    }

    const dateMismatch = dateSet.size > 1 ? dateSet.size - 1 : 0;

    if (errors >= 2 || dateMismatch >= 2) return "red";
    if (errors >= 1 || dateMismatch >= 1) return "yellow";
    return "green";
}

function updateOverallCheckStatus(status, sections) {
    const tile = document.getElementById("tile-checks");
    tile.dataset.overall = status;

    const statusEl = document.getElementById("status-checks");
    if (!statusEl) return;

    const badgeClass =
        status === "green" ? "badge-green" :
        status === "yellow" ? "badge-yellow" :
        "badge-red";

    statusEl.innerHTML = `
        <span class="badge ${badgeClass}">
            ${status === "green" ? "OK" : status === "yellow" ? "WARN" : "ERROR"}
        </span>
        <span class="mini-heatmap"></span>
    `;

    renderMiniHeatmap(sections);
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

        if (item.status !== "success") cls = "hm-error";
        else if (normalizeDateStr(item.lastDateStr) !== mostCommonDate) cls = "hm-warning";

        return `<span class="hm ${cls}"></span>`;
    }).join("");
}