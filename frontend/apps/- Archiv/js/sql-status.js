/* ======================================================
   SQL-STATUS.JS – System-Heartbeat für SQL Server
   MIT BACKEND-OFFLINE-FALLBACK
   Backend-Port: 4000 (Cockpit)
====================================================== */
import { formatTimestamp } from "../../../shared/utils/time.js";

/* ----------------------------------------------
   SYSTEM-STATUS LOGIK (Badge + Heatmap)
---------------------------------------------- */
function computeSystemStatus(s) {
    const points = [
        s.backendOnline ? "green" : "red",
        s.portOpen ? "green" : "red",
        s.serviceRunning ? "green" : "red",
        s.queryOk ? "green" : (s.portOpen ? "yellow" : "red")
    ];

    let badge = "red";
    let text = "Systemfehler";

    const allGreen = points.every(p => p === "green");
    const anyYellow = points.includes("yellow");

    if (allGreen) {
        badge = "green";
        text = "System OK";
    } else if (anyYellow) {
        badge = "yellow";
        text = "System Warnung";
    }

    return { badge, text, points };
}

function renderSystemHeatmap(points) {
    return `
        <div class="mini-heatmap">
            ${points.map(p => {
                const cls =
                    p === "green"  ? "hm-success" :
                    p === "yellow" ? "hm-warning" :
                                     "hm-error";
                return `<span class="hm ${cls}"></span>`;
            }).join("")}
        </div>
    `;
}


function renderSystemBadge(badge, text) {
    const cls =
        badge === "green"  ? "badge-green" :
        badge === "yellow" ? "badge-yellow" :
                             "badge-red";

    return `<span class="badge ${cls}">${text}</span>`;
}


export async function initSqlStatus() {
    console.log("🔍 INIT SQL STATUS START");

    const container = document.getElementById("sql-status-root");
    console.log("🔍 CONTAINER FOUND:", container);

    if (!container) {
        console.error("❌ sql-status-root NICHT gefunden!");
        return;
    }

    const status = await checkSqlStatus();
    console.log("🔍 STATUS RESULT:", status);

    // Systemstatus berechnen
    const sys = computeSystemStatus(status);

    // --- Badge an Cockpit-Header senden ---
    window.parent.postMessage({
        type: "system-status-update",
        badge: sys.badge,
        text: sys.text
    }, "*");

    // HTML rendern
    const html = renderSqlStatus(status);
    console.log("🔍 RENDERED HTML:", html);

    container.innerHTML = html;

    // Prüfen, ob danach etwas überschrieben wird
    setTimeout(() => {
        console.log("🔍 FINAL DOM CONTENT:", container.innerHTML);
    }, 100);
}

/* ----------------------------------------------
   1) SQL-STATUS PRÜFUNG
---------------------------------------------- */
async function checkSqlStatus() {
    const result = {
        backendOnline: false,
        portOpen: false,
        serviceRunning: false,
        queryOk: false,
        lastSuccess: localStorage.getItem("sql_last_success") || "–",
        timestamp: new Date().toISOString()
    };

    // 0) Backend erreichbar?
    result.backendOnline = await testBackend();

    // Wenn Backend TOT → Fallback
    if (!result.backendOnline) {
        return result; // NICHTS weiter prüfen
    }

    // 1) Port 1433 testen (über Backend)
    result.portOpen = await testPort1433();

    // 2) Dienststatus prüfen
    result.serviceRunning = await testSqlService();

    // 3) SELECT 1 testen
    if (result.portOpen) {
        result.queryOk = await testSqlQuery();
    }

    // Erfolg speichern
    if (result.portOpen && result.queryOk) {
        localStorage.setItem("sql_last_success", result.timestamp);
        result.lastSuccess = result.timestamp;
    }

    return result;
}


/* ----------------------------------------------
   0) BACKEND ERREICHBAR?
---------------------------------------------- */
async function testBackend() {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 500);

        await fetch("http://localhost:4000/api/system/ping", { signal: controller.signal });
        return true;
    } catch {
        return false;
    }
}


/* ----------------------------------------------
   1) PORT 1433 TESTEN (über Backend)
---------------------------------------------- */
async function testPort1433() {
    try {
        const res = await fetch("http://localhost:4000/api/system/port-check");
        const data = await res.json();
        return data.portOpen === true;
    } catch {
        return false;
    }
}


/* ----------------------------------------------
   2) SQL-DIENSTSTATUS TESTEN
---------------------------------------------- */
async function testSqlService() {
    try {
        const res = await fetch("http://localhost:4000/api/system/sql-service");
        const data = await res.json();
        return data.running === true;
    } catch {
        return false;
    }
}


/* ----------------------------------------------
   3) SELECT 1 TESTEN
---------------------------------------------- */
async function testSqlQuery() {
    try {
        const res = await fetch("http://localhost:4000/api/system/sql-test");
        const data = await res.json();
        return data.ok === true;
    } catch {
        return false;
    }
}


/* ----------------------------------------------
   4) UI-RENDERING
---------------------------------------------- */
function renderSqlStatus(s) {

    const sys = computeSystemStatus(s);

    // Backend tot → Fallback
    if (!s.backendOnline) {
        return `
            <div id="sql-status-widget">

                <div class="system-status-header">
                    <div class="system-status-title">System Status</div>

                    <div class="system-status-row">
                        ${renderSystemBadge(sys.badge, sys.text)}
                        ${renderSystemHeatmap(sys.points)}
                    </div>
                </div>

                <div class="sql-status-line">
                    <span class="sql-status-label">Backend:</span>
                    <span class="sql-status-value sql-error">OFFLINE</span>
                </div>

                <div class="sql-status-line">
                    <span class="sql-status-label">SQL Status:</span>
                    <span class="sql-status-value sql-warning">UNBEKANNT</span>
                </div>

                <div class="sql-status-line">
                    <span class="sql-status-label">Letzter Erfolg:</span>
                    <span class="sql-status-value">${formatTimestamp(s.lastSuccess)}</span>
                </div>
            </div>
        `;
    }

    // Backend online → normaler Status
    const statusClass =
        s.portOpen && s.queryOk ? "sql-ok" :
        s.portOpen && !s.queryOk ? "sql-warning" :
        "sql-error";

    const statusText =
        s.portOpen && s.queryOk ? "OK" :
        s.portOpen && !s.queryOk ? "WARNUNG" :
        "ERROR";

    return `
        <div id="sql-status-widget">

            <div class="system-status-header">
                <div class="system-status-title">System Status</div>

                <div class="system-status-row">
                    ${renderSystemBadge(sys.badge, sys.text)}
                    ${renderSystemHeatmap(sys.points)}
                </div>
            </div>


            <div class="sql-status-line">
                <span class="sql-status-label">Backend:</span>
                <span class="sql-status-value sql-ok">ONLINE</span>
            </div>

            <div class="sql-status-line">
                <span class="sql-status-label">SQL Status:</span>
                <span class="sql-status-value ${statusClass}">${statusText}</span>
            </div>

            <div class="sql-status-line">
                <span class="sql-status-label">Port 1433:</span>
                <span class="sql-status-value ${s.portOpen ? "sql-ok" : "sql-error"}">
                    ${s.portOpen ? "offen" : "blockiert"}
                </span>
            </div>

            <div class="sql-status-line">
                <span class="sql-status-label">Dienst:</span>
                <span class="sql-status-value ${s.serviceRunning ? "sql-ok" : "sql-error"}">
                    ${s.serviceRunning ? "läuft" : "gestoppt"}
                </span>
            </div>

            <div class="sql-status-line">
                <span class="sql-status-label">Test-Query:</span>
                <span class="sql-status-value ${s.queryOk ? "sql-ok" : "sql-error"}">
                    ${s.queryOk ? "OK" : "Fehler"}
                </span>
            </div>

            <div class="sql-status-line">
                <span class="sql-status-label">Letzter Erfolg:</span>
                <span class="sql-status-value">${formatTimestamp(s.lastSuccess)}</span>
            </div>
        </div>
    `;
}

