const fs = require("fs");
const path = require("path");
const os = require("os");

const HOST = os.hostname();
const STATUS_FILE = path.join(__dirname, "../db", `cockpit_status_${HOST}.json`);

console.log("HOSTNAME:", os.hostname()); // Debugging
console.log("STATUS_FILE Pfad:", STATUS_FILE); // Debugging
// ------------------------------------------------------
// Status lesen
// ------------------------------------------------------
function readStatusFile() {
    try {
        return fs.existsSync(STATUS_FILE) ? JSON.parse(fs.readFileSync(STATUS_FILE, "utf8")) : {};
    } catch (err) {
        console.error("Fehler beim Lesen der Status-Datei:", err);
        return {};
    }
}

// ------------------------------------------------------
// Status schreiben (atomisch)
// ------------------------------------------------------
function writeStatusFile(data) {
    try {
        const tmpFile = `${STATUS_FILE}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf8");
        fs.renameSync(tmpFile, STATUS_FILE);
    } catch (err) {
        console.error("Fehler beim Schreiben der Status-Datei:", err);
    }
}

// ------------------------------------------------------
// Einzelnen Tile-Status aktualisieren (DYNAMISCH)
// ------------------------------------------------------
function updateTileStatus(category, payload) {
    //console.log("DEBUG Payload:", JSON.stringify(payload, null, 2)); // <--- HIER EINFÜGEN
    const status = readStatusFile();

    // Initiale Struktur sicherstellen
    status[category] = status[category] || {};

    // 🔹 DYNAMISCHE LOGIK:
    // Wenn 'payload' verschachtelt ist (z.B. { Signals: {...} }), 
    // mergen wir jeden Key einzeln (gut für 'calculations' und 'downloads').
    // Wenn es ein direktes Objekt ist (wie bei 'checks'), überschreiben wir es.
    
    if (category === "checks") {
        status.checks = payload;
    } else {
        // 🔹 DYNAMISCHE LOGIK:
        Object.keys(payload).forEach(key => {
            const incomingData = payload[key];
            const existingData = status[category][key] || {};

            // Wir erstellen ein neues Objekt, aber ignorieren den Strich beim Mergen
            const mergedData = { ...existingData, ...incomingData };
            
            if (incomingData.duration === "–") {
                delete mergedData.duration; // Löscht den Strich, damit das alte Feld bleibt
            }

            status[category][key] = mergedData;
        });
    }

    writeStatusFile(status);
}

module.exports = { readStatusFile, writeStatusFile, updateTileStatus };