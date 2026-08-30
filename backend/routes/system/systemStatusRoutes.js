// routes/systemStatus.js
// ======================================================
// System-Status-Routen für SQL, Backend-Ping, Port-Check
// Cockpit-Backend (Port 4000)
// ======================================================

const express = require("express");
const net = require("net");
const { exec } = require("child_process");

// Deine bestehenden SQL-Verbindungen
const {
    sql,
    tradingPool,
    tradingConnect
} = require("../../db/connection.js");

const router = express.Router();


// ------------------------------------------------------
// 1) Backend-Ping
// ------------------------------------------------------
router.get("/ping", (req, res) => {
    res.json({ ok: true });
});


// ------------------------------------------------------
// 2) Port-Check (1433)
// ------------------------------------------------------
router.get("/port-check", (req, res) => {
    const socket = new net.Socket();
    socket.setTimeout(500);

    socket.on("connect", () => {
        socket.destroy();
        res.json({ portOpen: true });
    });

    socket.on("timeout", () => {
        socket.destroy();
        res.json({ portOpen: false });
    });

    socket.on("error", () => {
        res.json({ portOpen: false });
    });

    socket.connect(1433, "127.0.0.1");
});


// ------------------------------------------------------
// 3) SQL-Dienststatus prüfen (mit Fallback)
// ------------------------------------------------------
router.get("/sql-service", (req, res) => {
    // Wir prüfen nacheinander die Standard-Instanz und Express
    exec(`sc query "MSSQLSERVER" || sc query "MSSQL$SQLEXPRESS"`, (err, stdout) => {
        if (err) {
            // Wenn beide Befehle scheitern, könnte es an fehlenden Rechten liegen
            // Da wir wissen, dass die Query (sql-test) evtl. klappt, loggen wir es nur
            return res.json({ running: false, error: "Dienst nicht gefunden oder Zugriff verweigert" });
        }

        const running = stdout.includes("RUNNING");
        res.json({ running });
    });
});

// ------------------------------------------------------
// 4) SELECT 1 Test – über deinen tradingPool
// ------------------------------------------------------
router.get("/sql-test", async (req, res) => {
    try {
        // Nutze einen Request mit kurzem Timeout, damit das UI nicht einfriert
        const request = tradingPool.request();
        request.timeout = 1000; // 1 Sekunde reicht für SELECT 1 völlig aus
        
        const result = await request.query("SELECT 1 AS ok");

        if (result?.recordset?.[0]?.ok === 1) {
            return res.json({ ok: true });
        }
        res.json({ ok: false });
    } catch (err) {
        res.json({ ok: false, error: err.message });
    }
});

module.exports = router;
