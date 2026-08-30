const fs = require('fs');
const path = require('path');
const logger = require('./logger');   // WICHTIG: Logger importieren

// ---------------------------------------------------------
// SCHRITT 1: Trading-Date Helper
// ---------------------------------------------------------
function getTradingDate() {
    const now = new Date();
    const hours = now.getHours();
    let targetDate = new Date(now);

    if (hours < 22) {
        targetDate.setDate(targetDate.getDate() - 1);
    }

    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek === 6) targetDate.setDate(targetDate.getDate() - 1);
    else if (dayOfWeek === 0) targetDate.setDate(targetDate.getDate() - 2);

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------
// SCHRITT 2: Double-Saving Helper
// ---------------------------------------------------------
function saveWithArchive(fileName, data) {
    const tradingDate = getTradingDate();
    
    const dbDir = path.join(__dirname, '..', 'db');                // FIX
    const archiveDir = path.join(__dirname, '..', 'json-history'); // FIX

    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
    }

    const livePath = path.join(dbDir, fileName);
    const archiveNameOnly = fileName.replace('finviz_', '');
    const archivePath = path.join(archiveDir, `${tradingDate}_${archiveNameOnly}`);

    const jsonData = JSON.stringify(data, null, 2);

    try {
        fs.writeFileSync(livePath, jsonData);
        fs.writeFileSync(archivePath, jsonData);

        logger.update('ARCHIVE', `Double-Save erfolgreich → ${fileName}`);
    } catch (err) {
        logger.error('ARCHIVE', `Fehler beim Double-Save: ${err.message}`);
    }
}

module.exports = {
    getTradingDate,
    saveWithArchive
};
