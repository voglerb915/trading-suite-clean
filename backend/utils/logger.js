const fs = require('fs');
const path = require('path');

function writeLog(moduleName, level, message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${moduleName}] [${level}] ${message}`;

    // Logfile-Pfad
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const file = path.join(logDir, `app.log`);

    // In Datei schreiben
    fs.appendFileSync(file, line + '\n');

    // Zusätzlich im Terminal ausgeben
    console.log(line);
}

module.exports = {
    info(moduleName, message) {
        writeLog(moduleName, 'INFO', message);
    },

    error(moduleName, message) {
        writeLog(moduleName, 'ERROR', message);
    },

    warn(moduleName, message) {
        writeLog(moduleName, 'WARN', message);
    },

    update(moduleName, message) {
        writeLog(moduleName, 'UPDATE', message);
    }
};
