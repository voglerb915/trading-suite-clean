// ======================================================
//  LOGIC.JS – Gemeinsame Logik für alle Control-Tiles
//  Enthält: Status, Persistenz, Modal, Progress, Format
// ======================================================


// ------------------------------------------------------
// 1) STATUS-LOGIK (updateTile)
// ------------------------------------------------------
export function updateTile(key, data) {
    const tile = document.getElementById(`tile-${key}`);
    const status = document.getElementById(`status-${key}`);
    const progress = document.getElementById(`progress-${key}`);

    if (data.status) {
        tile.className = `control-tile ${data.status}`;

        // Checks-Kachel NICHT überschreiben
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



// ------------------------------------------------------
// 2) STATUS-PERSISTENZ (load + save)
// ------------------------------------------------------
export async function loadPersistedStatus() {
    try {
        const res = await fetch("http://localhost:4000/api/system/cockpit");
        if (!res.ok) return;

        const status = await res.json();

        // Downloads
        if (status.downloads) {
            import("./tiles/downloads.js")
                .then(m => m.renderDownloadsStatus(status.downloads));
        }

        // Calculations
        if (status.calculations) {
            import("./tiles/calculations.js")
                .then(m => m.renderCalculationsTable(status.calculations));
        }

        // Checks
        if (status.checks) {
            updateTile("checks", status.checks);

            if (status.checks.sections) {
                import("./tiles/checks.js")
                    .then(m => m.renderCheckSections(status.checks.sections));
            }
        }

    } catch (err) {
        console.warn("Status konnte nicht geladen werden:", err);
    }
}



export async function saveTileStatus(tile, payload) {
    try {
        await fetch(`http://localhost:4000/api/system/cockpit/${tile}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.warn("Status konnte nicht gespeichert werden:", err);
    }
}



// ------------------------------------------------------
// 3) MODAL-LOGIK (Log-Fenster)
// ------------------------------------------------------
export function openLogModal(title, body) {
    document.getElementById("log-title").textContent = title;
    document.getElementById("log-body").textContent = body;
    document.getElementById("log-modal").classList.remove("hidden");
}

document.addEventListener("click", (e) => {
    if (e.target.id === "log-close") {
        document.getElementById("log-modal").classList.add("hidden");
    }
});



// ------------------------------------------------------
// 4) PROGRESS-SIMULATION (für Checks & Calculations)
// ------------------------------------------------------
export function simulateProgress(key) {
    let p = 0;
    const interval = setInterval(() => {
        p += 8;
        updateTile(key, { progress: p });
        if (p >= 90) clearInterval(interval);
    }, 120);
}



// ------------------------------------------------------
// 5) FORMAT-FUNKTIONEN
// ------------------------------------------------------
export function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

export function formatDateTimeShort(str) {
    if (!str) return "–";

    const [date, time] = str.split(" ");
    if (!time) return date;

    const [hh, mm] = time.split(":");
    return `${date} ${hh}:${mm}`;
}

export function formatSqlDate(date) {
    const d = new Date(date);
    return d.getFullYear() + "-" +
           String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
}



// ------------------------------------------------------
// 6) STEP-STATUS (für Calculations)
// ------------------------------------------------------
export function updateStepStatus(stepKey, status) {
    const el = document.getElementById(`step-status-${stepKey}`);
    if (!el) return;

    el.textContent =
        status === "pending" ? "–" :
        status === "running" ? "⏳" :
        status === "success" ? "✔️" :
        status === "error" ? "❌" : status;

    el.className = `step-status ${status}`;
}
