const fs = require('fs');

const inputFile = 'finviz.csv';
const outputFile = 'finviz_import.csv';
const fixedTimestamp = '2026-08-07 22:15:01.000'; 

const MAX_TITLE_LENGTH = 250; 
const MAX_DIGEST_LENGTH = 100; // Passe diesen Wert an, falls deine SQL-Spalte z.B. VARCHAR(250) hat

function parseCSVLine(text) {
    let result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            current += char;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

try {
    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split(/\r?\n/);

    if (lines.length === 0 || lines[0].trim() === '') {
        console.error('Die CSV-Datei ist leer.');
        process.exit(1);
    }

    const headerCols = parseCSVLine(lines[0]);
    let titleIdx = headerCols.findIndex(col => col.replace(/^"|"$/g, '').trim() === 'News Title');
    let urlIdx = headerCols.findIndex(col => col.replace(/^"|"$/g, '').trim() === 'News URL');
    let digestIdx = headerCols.findIndex(col => col.replace(/^"|"$/g, '').trim() === 'Daily Digest');

    const newLines = [];
    newLines.push(`anl_datum,${lines[0]}`);

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        if (line.trim() === '') continue;

        let cols = parseCSVLine(line);

        // News Title bereinigen und begrenzen
        if (titleIdx !== -1 && cols[titleIdx] !== undefined) {
            let val = cols[titleIdx];
            let cleanVal = val.replace(/^"|"$/g, '').replace(/"/g, "'");
            if (cleanVal.length > MAX_TITLE_LENGTH) {
                cleanVal = cleanVal.substring(0, MAX_TITLE_LENGTH);
            }
            cols[titleIdx] = `"${cleanVal}"`;
        }

        // News URL bereinigen (ohne harte Längenbegrenzung)
        if (urlIdx !== -1 && cols[urlIdx] !== undefined) {
            let val = cols[urlIdx];
            let cleanVal = val.replace(/^"|"$/g, '').replace(/"/g, '');
            cols[urlIdx] = `"${cleanVal}"`;
        }

        // Daily Digest bereinigen und auf max. Länge begrenzen, damit SQL nicht abbricht
        if (digestIdx !== -1 && cols[digestIdx] !== undefined) {
            let val = cols[digestIdx];
            let cleanVal = val.replace(/^"|"$/g, '').replace(/"/g, "'");
            if (cleanVal.length > MAX_DIGEST_LENGTH) {
                cleanVal = cleanVal.substring(0, MAX_DIGEST_LENGTH);
            }
            cols[digestIdx] = `"${cleanVal}"`;
        }

        newLines.push(`"${fixedTimestamp}",${cols.join(',')}`);
    }

    fs.writeFileSync(outputFile, newLines.join('\n'), 'utf8');
    console.log(`Erfolg! Saubere '${outputFile}' wurde generiert (${newLines.length - 1} Zeilen).`);

} catch (err) {
    console.error('Fehler:', err.message);
}