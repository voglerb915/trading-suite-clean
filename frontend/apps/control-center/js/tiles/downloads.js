import { updateTile, saveTileStatus, loadPersistedStatus } from "../logic.js";
import { formatTimestamp } from "../../../../shared/utils/time.js";


export function renderDownloadsStatus(downloads) {
    const root = document.getElementById("results-downloads");
    if (!root) return;

    const rows = [
        { key: "IndexHistory", label: "IndexHistory" },
        { key: "DailyHistory", label: "DailyHistory" }
    ];

    root.innerHTML = `
        <table class="downloads-table">
            <colgroup>
                <col>
                <col>
                <col>
                <col>
                <col>
            </colgroup>

            <thead>
                <tr>
                    <th>Tabelle</th>
                    <th style="text-align: center;">Status</th>
                    <th style="text-align: center;">Letzter Lauf</th>
                    <th style="text-align: center;">Dauer</th>
                    <th style="text-align: center;">Aktion</th>
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
                            <td>${s.lastRun ? formatTimestamp(s.lastRun) : "–"}</td>
                            <td>${s.duration || "–"}</td>
                            <td class="download-action" data-key="${r.key}" style="cursor: pointer;">📥</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;


    root.onclick = (e) => {
        const el = e.target.closest(".download-action");
        if (!el) return;

        e.stopPropagation();
        const key = el.dataset.key;

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

export async function runIndexHistory() {
    updateTile("downloads", { status: "running", progress: 0 });
    
    // 🟢 STARTZEIT MESSEN
    const startTime = performance.now(); 

    return new Promise((resolve) => {
        const evtSource = new EventSource("http://localhost:4000/api/data/downloads/stream");

        evtSource.addEventListener("progress", (e) => {
            // ... (dein restlicher Code)
        });

        evtSource.addEventListener("done", async () => {
            evtSource.close();

            // 🟢 DAUER BERECHNEN
            const endTime = performance.now();
            const durationInSeconds = Math.round((endTime - startTime) / 1000);
            const durationString = `${durationInSeconds}s`;

            await saveTileStatus("downloads", {
                IndexHistory: {
                    ok: true,
                    lastRun: new Date(),
                    duration: durationString // 🟢 Hier wird jetzt der berechnete Wert gesendet!
                }
            });

            await loadPersistedStatus();
            resolve();
        });
    });
}

export async function runDailyHistory() {
    updateTile("downloads", { status: "running", progress: 0 });

    // 🟢 STARTZEIT MESSEN
    const startTime = performance.now();

    return new Promise((resolve) => {
        const evtSource = new EventSource("http://localhost:4000/api/data/downloads/stream-daily");

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

            // 🟢 DAUER BERECHNEN
            const endTime = performance.now();
            const durationInSeconds = Math.round((endTime - startTime) / 1000);
            const durationString = `${durationInSeconds}s`;

            await saveTileStatus("downloads", {
                DailyHistory: {
                    ok: true,
                    lastRun: new Date(),
                    duration: durationString // 🟢 Hier wird jetzt der berechnete Wert gesendet
                }
            });

            await loadPersistedStatus();
            resolve();
        });
    });
}