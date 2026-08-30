const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function parseFinvizSectors() {
    let browser;
    try {
        console.log('Starte Browser für Finviz Redesign...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        console.log('Navigiere zu Finviz Gruppen-Screener...');
        await page.goto('https://finviz.com/groups.ashx?g=sector', { waitUntil: 'networkidle2', timeout: 30000 });

        // Warten, bis das Finviz JS-Bundle die Daten gerendert hat (wir suchen nach bekannten Sektoren im Text)
        console.log('Warte auf das Rendern der Sektor-Tabelle...');
        await page.waitForFunction(
            () => document.body.innerText.includes('Basic Materials') && document.body.innerText.includes('Technology'),
            { timeout: 15000 }
        ).catch(() => console.log('Timeout beim Warten – versuche Daten auszulesen...'));

        // Zusätzlicher kurzer Puffer für Animationen/Async-Rendering
        await new Promise(r => setTimeout(r, 3000));

        const dataRows = await page.evaluate(() => {
            const rows = [];
            const validSectors = [
                'Basic Materials', 'Communication Services', 'Consumer Cyclical', 
                'Consumer Defensive', 'Energy', 'Financial', 'Healthcare', 
                'Industrials', 'Real Estate', 'Technology', 'Utilities'
            ];

            const headers = [
                'No', 'Name', 'Stocks', 'Market Cap', 'Dividend', 'P/E', 
                'Fwd P/E', 'PEG', 'LT Debt/Eq', 'Debt/Eq', 'Float Short', 
                'Recom', 'Change %', 'Volume'
            ];

            // Im neuen Redesign liegen die Tabellendaten oft in spezifischen Containern oder klassenbasierten Zeilen
            const trs = document.querySelectorAll('tr');

            trs.forEach(tr => {
                const text = tr.innerText;
                const matchedSector = validSectors.find(sec => text.includes(sec));

                if (matchedSector && !text.includes('Industry (') && !text.includes('Order By')) {
                    const tds = Array.from(tr.querySelectorAll('td, th'))
                        .map(el => el.innerText.trim())
                        .filter(Boolean);

                    // Echte Datenzeilen haben im Redesign eine ausreichende Anzahl an Spalten
                    if (tds.length >= 5) {
                        const rowData = {};
                        tds.forEach((val, idx) => {
                            if (idx < headers.length) {
                                rowData[headers[idx]] = val;
                            }
                        });
                        rowData['Name'] = matchedSector;
                        rows.push(rowData);
                    }
                }
            });

            // Duplikate über den Sektornamen entfernen
            const uniqueRows = [];
            const seenNames = new Set();
            rows.forEach(r => {
                if (r.Name && !seenNames.has(r.Name)) {
                    seenNames.add(r.Name);
                    uniqueRows.push(r);
                }
            });

            return uniqueRows;
        });

        if (dataRows.length === 0) {
            console.error('Fehler: Keine Sektor-Datenzeilen im DOM gefunden.');
            return;
        }

        console.log(`Erfolgreich ${dataRows.length} Sektoren extrahiert!`);
        console.table(dataRows.slice(0, 5));

        const outputPath = path.join(__dirname, 'finviz_data.json');
        fs.writeFileSync(outputPath, JSON.stringify(dataRows, null, 2));
        console.log(`Daten erfolgreich in ${outputPath} gespeichert.`);

    } catch (e) {
        console.error('Fehler im Skript:', e.message);
    } finally {
        if (browser) await browser.close();
    }
}

parseFinvizSectors();