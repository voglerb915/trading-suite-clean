const express = require("express");
const router = express.Router();
const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadYahooStocks } = require("../../services/downloads/loadYahooStocks");

// Pfad zur Host-basierten Status-Datei
function getStatusFilePath() {
    const host = os.hostname().replace(/[^a-zA-Z0-9_-]/g, "");
    return path.join(__dirname, "..", `cockpit_status_${host}.json`);
}

// Status lesen
function readStatus() {
    const file = getStatusFilePath();
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

// Status schreiben
function writeStatus(section, data) {
    const file = getStatusFilePath();
    const current = readStatus();

    if (!current.downloads) current.downloads = {};
    current.downloads[section] = data;

    fs.writeFileSync(file, JSON.stringify(current, null, 2));
}

// ---------------------------------------------------------
// DailyHistory Download
// ---------------------------------------------------------
router.get("/loadYahooStocks", async (req, res) => {
    const start = performance.now();

    try {
        const result = await loadYahooStocks();
        const duration = ((performance.now() - start) / 1000).toFixed(2) + "s";

        writeStatus("DailyHistory", {
            ok: result.ok,
            lastRun: new Date().toISOString(),
            duration
        });

        res.json({
            ok: true,
            message: "DailyHistory Download abgeschlossen.",
            duration,
            logs: result.logs
        });

    } catch (err) {
        const duration = ((performance.now() - start) / 1000).toFixed(2) + "s";

        writeStatus("DailyHistory", {
            ok: false,
            lastRun: new Date().toISOString(),
            duration
        });

        res.status(500).json({
            ok: false,
            error: err.message,
            duration
        });
    }
});

module.exports = router;
