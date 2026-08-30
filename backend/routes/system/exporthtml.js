import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Falls du ES-Modules nutzt, um __dirname nachzubauen:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================================================
// KONFIGURATION: HIER STEUERST DU DIE PFADE
// ==========================================================================
const EXPORT_CONFIG = {
    targetDirectory: 'D:/Homepage/Uploads/', // <-- DEIN SPEZIELLES LAUFWERK
    filename: 'meine_strategie.html',
    dateLogFile: path.join(__dirname, '../last_export_date.txt') // Loggt das letzte Export-Datum
};

// Diese Funktion wird aufgerufen, wenn die Route getriggert wird
export async function handleAutoExport(dataForHomepage) {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    // 1. Prüfen, wo das Log-File liegt und Datum auslesen
    let lastExportDate = '';
    if (fs.existsSync(EXPORT_CONFIG.dateLogFile)) {
        lastExportDate = fs.readFileSync(EXPORT_CONFIG.dateLogFile, 'utf8').trim();
    }

    // 2. Wenn das Datum übereinstimmt -> Abbrechen, für heute erledigt
    if (today === lastExportDate) {
        console.log(`[Autopilot Export] Bereits aktuell für heute (${today}).`);
        return;
    }

    console.log(`[Autopilot Export] Neues Datum erkannt (${today})! Generiere HTML...`);

    // 3. Prüfen, ob das Spezial-Laufwerk/Verzeichnis überhaupt existiert
    if (!fs.existsSync(EXPORT_CONFIG.targetDirectory)) {
        console.error(`[Autopilot Export] FEHLER: Laufwerk oder Ordner "${EXPORT_CONFIG.targetDirectory}" existiert nicht!`);
        return;
    }

    // 4. HTML-Inhalt generieren
    const htmlContent = buildHomepageHTML(dataForHomepage);
    const fullTargetPath = path.join(EXPORT_CONFIG.targetDirectory, EXPORT_CONFIG.filename);

    try {
        // 5. Datei schreiben & Datums-Stempel aktualisieren
        fs.writeFileSync(fullTargetPath, htmlContent, 'utf8');
        fs.writeFileSync(EXPORT_CONFIG.dateLogFile, today, 'utf8');
        console.log(`[Autopilot Export] ERFOLG! Datei geschrieben nach: ${fullTargetPath}`);
    } catch (err) {
        console.error(`[Autopilot Export] Fehler beim Schreiben auf das Laufwerk:`, err);
    }
}

// Hilfsfunktion für den HTML-Code (dein Homepage-Layout)
function buildHomepageHTML(data) {
    // Hier loopst du durch deine SQL-Ergebnisse
    const rows = data.map(stock => `
        <tr>
            <td style="text-align: center;">${stock.rank}</td>
            <td>${stock.name}</td>
            <td style="text-align: center;">${stock.score}</td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Strategie Übersicht</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #ffffff; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: 600; border-bottom: 2px solid #000000; }
        tr:nth-child(even) { background-color: #fafafa; }
    </style>
</head>
<body>
    <h2>Strategie Live-Daten (Stand: ${new Date().toLocaleDateString('de-DE')})</h2>
    <table>
        <thead>
            <tr>
                <th style="width: 50px; text-align: center;">Rank</th>
                <th>Stock</th>
                <th style="width: 80px; text-align: center;">Score</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
</body>
</html>`;
}

export default router;