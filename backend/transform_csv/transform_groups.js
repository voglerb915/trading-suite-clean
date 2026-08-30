const fs = require('fs');

function processCsv(inputFile, outputFile, groupType) {
    if (!fs.existsSync(inputFile)) {
        console.log(`Datei nicht gefunden: ${inputFile}`);
        return;
    }

    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split(/\r?\n/);

    if (lines.length === 0 || lines[0].trim() === '') return;

    const timestamp = '"2026-08-10 22:15:01.000"';
    const sep = ',';

    const newHeader = [`anl_datum`, `group`, `name`, `perf_week`, `perf_month`, `perf_quart`, `perf_half`, `perf_year`, `perf_ytd`, `recom`, `avg_volume`, `rel_volume`, `change`, `volume`].join(sep);
    const newLines = [newHeader];

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        let cols = [];
        let current = '';
        let inQuotes = false;
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                cols.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        cols.push(current.trim().replace(/^"|"$/g, ''));

        if (cols.length < 2) continue;

        const cleanNum = (val) => {
            if (!val || val === '-' || val === '') return '0';
            return val.replace('%', '').replace(/,/g, '');
        };

        let name = `"${cols[1]}"`; 

        // Exaktes Mapping für Performance-CSV auf deine Tabellenspalten:
        let perfWeek  = cols.length > 2  ? cleanNum(cols[2])  : '0';
        let perfMonth = cols.length > 3  ? cleanNum(cols[3])  : '0';
        let perfQuart = cols.length > 4  ? cleanNum(cols[4])  : '0';
        let perfHalf  = cols.length > 5  ? cleanNum(cols[5])  : '0';
        let perfYear  = cols.length > 6  ? cleanNum(cols[6])  : '0';
        let perfYtd   = cols.length > 7  ? cleanNum(cols[7])  : '0';
        let recom     = '0'; // Existiert in der Performance-CSV nicht, wird als 0 übergeben
        let avgVol    = cols.length > 8  ? cleanNum(cols[8])  : '0';
        let relVol    = cols.length > 9  ? cleanNum(cols[9])  : '0';
        let change    = cols.length > 10 ? cleanNum(cols[10]) : '0';
        let volume    = cols.length > 11 ? cleanNum(cols[11]) : '0';

        let rowData = [timestamp, groupType, name, perfWeek, perfMonth, perfQuart, perfHalf, perfYear, perfYtd, recom, avgVol, relVol, change, volume];
        newLines.push(rowData.join(sep));
    }

    fs.writeFileSync(outputFile, newLines.join('\n'), 'utf8');
    console.log(`Erfolgreich transformiert: ${outputFile} (${newLines.length - 1} Zeilen)`);
}

processCsv('finviz_sectors.csv', 'finviz_sectors_import.csv', 'sector');
processCsv('finviz_industries.csv', 'finviz_industries_import.csv', 'industry');