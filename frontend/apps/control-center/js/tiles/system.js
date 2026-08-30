// ======================================================
// SYSTEM.JS – System-Status für Control-Center
// ======================================================

import { formatTimestamp } from "../../../../shared/utils/time.js";

const BASE_URL = `http://${location.hostname}:4000`;

// ----------------------------------------------
// 1) System-Status Logik (unverändert aus LAB)
// ----------------------------------------------
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


// ----------------------------------------------
// 2) Backend-Tests (unverändert aus LAB)
// ----------------------------------------------
async function testBackend() {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 500);
        await fetch(`${BASE_URL}/api/system/ping`, { signal: controller.signal });
        return true;
    } catch {
        return false;
    }
}

async function testPort1433() {
    try {
        const res = await fetch(`${BASE_URL}/api/system/port-check`);
        const data = await res.json();
        return data.portOpen === true;
    } catch {
        return false;
    }
}

async function testSqlService() {
    try {
        const res = await fetch(`${BASE_URL}/api/system/sql-service`);
        const data = await res.json();
        return data.running === true;
    } catch {
        return false;
    }
}

async function testSqlQuery() {
    try {
        const res = await fetch(`${BASE_URL}/api/system/sql-test`);
        const data = await res.json();
        return data.ok === true;
    } catch {
        return false;
    }
}


// ----------------------------------------------
// 3) Hauptfunktion für Control-Center
// ----------------------------------------------
export async function runSystemStatus() {

    const result = {
        backendOnline: false,
        portOpen: false,
        serviceRunning: false,
        queryOk: false,
        lastSuccess: localStorage.getItem("sql_last_success") || "–",
        timestamp: new Date().toISOString()
    };

    // Backend erreichbar?
    result.backendOnline = await testBackend();

    if (!result.backendOnline) {

        // Systemstatus berechnen
        const sys = computeSystemStatus(result);

        // Cockpit-Header informieren
        window.parent.postMessage({
            type: "system-status-update",
            badge: sys.badge,
            text: sys.text
        }, "*");

        return {
            ok: false,
            html: renderSystemFallback(result)
        };
    }

    // Port, Dienst, Query
    result.portOpen = await testPort1433();
    result.serviceRunning = await testSqlService();
    if (result.portOpen) result.queryOk = await testSqlQuery();

    // Erfolg speichern
    if (result.portOpen && result.queryOk) {
        localStorage.setItem("sql_last_success", result.timestamp);
        result.lastSuccess = result.timestamp;
    }

    // Systemstatus berechnen
    const sys = computeSystemStatus(result);

    // Cockpit-Header informieren
    window.parent.postMessage({
        type: "system-status-update",
        badge: sys.badge,
        text: sys.text
    }, "*");

    return {
        ok: true,
        html: renderSystemNormal(result)
    };
}


// ----------------------------------------------
// 4) Rendering für Control-Center
// ----------------------------------------------
function renderSystemFallback(s) {
    const sys = computeSystemStatus(s);

    return `
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
    `;
}

function renderSystemNormal(s) {
    const sys = computeSystemStatus(s);

    const statusClass =
        s.portOpen && s.queryOk ? "sql-ok" :
        s.portOpen && !s.queryOk ? "sql-warning" :
        "sql-error";

    const statusText =
        s.portOpen && s.queryOk ? "OK" :
        s.portOpen && !s.queryOk ? "WARNUNG" :
        "ERROR";

    return `
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
    `;
}
