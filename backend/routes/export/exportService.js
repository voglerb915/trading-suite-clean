const fs = require('fs');
const path = require('path');

const exportService = {
    generate(type, data, options = {}, helpers = {}) {
        console.log('Empfangene Daten:', type, data ? data.length : 'keine Daten');
        const tradingDate = (helpers && helpers.getTradingDate)
            ? helpers.getTradingDate()
            : new Date().toISOString().split('T')[0];

        const baseDir = path.join(__dirname, '../../exportfiles');

        ['tv', 'history', 'analysis', 'journal', 'web'].forEach(subDir => {
            const fullPath = path.join(baseDir, subDir);
            if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
        });

        switch (type) {
            case 'TV_TOP100':
                return this._handleTradingView(data, options.strategyName, baseDir);

            case 'TV_MANUAL':
                return this._handleTVManual(data, options.filename || 'manual_filter', baseDir);

            case 'TV_CUSTOM_SELECT':
                return this._handleTVCustomSelect(data, options.meta, baseDir);

            case 'JOURNAL':
                return this._handleJournal(data, baseDir, tradingDate);

            case 'ANALYSIS':
                return this._handleAnalysis(data, options.filename, baseDir, tradingDate);

            case 'TV_SIGNALS':
                return this._handleTVSignals(data, options.filename, options.meta, baseDir);

            default:
                console.warn('Unbekannter Export-Typ:', type);
        }
    },

    // 1. Automatische TradingView Exporte (Top 100)
    _handleTradingView(data, strategy, baseDir) {
        if (!data || !Array.isArray(data)) return;
        const top100 = data.slice(0, 100);
        const tickers = top100.map(s => s.ticker).join(', ');
        fs.writeFileSync(path.join(baseDir, 'tv', `${strategy}.txt`), tickers);
        console.log(`✅ TV-Liste ${strategy}.txt aktualisiert.`);
    },

    // 2. Manueller Export
    _handleTVManual(data, filename, baseDir) {
        if (!data || !Array.isArray(data)) return;

        const tickers = data
            .slice(0, 250)
            .map(s => s.ticker)
            .join(', ');

        fs.writeFileSync(path.join(baseDir, 'tv', `${filename}.txt`), tickers);
        console.log(`📥 Manueller Export ${filename}.txt erstellt.`);
    },

    // 3. Custom Select Export (Hauptdatei + Tagesdatei)
    _handleTVCustomSelect(data, meta, baseDir) {
        if (!data || !Array.isArray(data)) return;

        const now = new Date();
        const date = now.toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\./g, '-').split('-').reverse().join('-');

        const time = now.toLocaleString('de-DE', {
            timeZone: 'Europe/Berlin',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const header = 
`# Strategy: ${meta?.strategy || '-'}
# Sector: ${meta?.sector || '-'}
# Industry: ${meta?.industry || '-'}
# Index: ${meta?.index || '-'}
# Generated: ${date} ${time}
`;

        // 1) Hauptdatei
        const mainFile = path.join(baseDir, 'tv', 'TV_custom_select.txt');
        console.log("Speicherort der Datei:", path.resolve(mainFile));
        const mainContent = header + '\n' + data.map(s => s.ticker).join('\n');
        fs.writeFileSync(mainFile, mainContent);

        // 2) Tagesdatei (append)
        const dayFile = path.join(baseDir, 'tv', `${date}_allExports.txt`);
        const block = 
`\n===========================
Export: ${time}
Strategy: ${meta?.strategy || '-'}
Sector: ${meta?.sector || '-'}
Industry: ${meta?.industry || '-'}
Index: ${meta?.index || '-'}
Count: ${data.length}
---------------------------
${data.map(s => s.ticker).join('\n')}
===========================\n`;

        fs.appendFileSync(dayFile, block);
        console.log(`📤 Custom TV Export aktualisiert (${data.length} Titel).`);
    },

    // 4. Journal
    _handleJournal(stock, baseDir, date) {
        const journalPath = path.join(baseDir, 'journal', 'trading_journal.csv');
        if (!fs.existsSync(journalPath))
            fs.writeFileSync(journalPath, 'Datum;Ticker;Preis;52W_High;Industrie\n');

        const line = `${date};${stock.ticker};${stock.price};${stock.high52_pct};${stock.industry}\n`;
        fs.appendFileSync(journalPath, line);
    },

    // 5. Analysis
    _handleAnalysis(data, filename, baseDir, date) {
        if (!data || data.length === 0) return;

        const headers = ['Datum', 'Ticker', 'Price', 'Lupfer', 'SMA_Slope', 'Sector', 'Industry'];
        const rows = data.map(s => [
            date, s.ticker, s.price, s.lupferScore || 0, s.sma_slope_percent || 0, s.sector, s.industry
        ].join(';'));

        fs.writeFileSync(
            path.join(baseDir, 'analysis', `${filename}_analysis.csv`),
            [headers.join(';'), ...rows].join('\n')
        );
    },

    // 6. Export Signals to TradingView
    _handleTVSignals(payload, filename, meta, baseDir) {
        const raw = payload.data || payload;
        const data = raw.slice(0, 200);

        const customHeader = payload.header || [];
        if (!data || !Array.isArray(data)) return;

        const now = new Date();
        const date = now.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
            .replace(/\./g, '-').split('-').reverse().join('-');
        const time = now.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

        const tickers = data.map(s => s.ticker).join('\n');

        let headerString = "";
        if (customHeader.length > 0) {
            headerString = customHeader.join('\n') + '\n';
        } else {
            headerString = `# Signal-Type: ${filename}\n# Generated: ${date} ${time}\n# Count: ${data.length}\n`;
        }

        const mainFile = path.join(baseDir, 'tv', `${filename}.txt`);
        fs.writeFileSync(mainFile, headerString + '\n' + tickers);

        const dayFile = path.join(baseDir, 'tv', `${date}_allExports.txt`);
        const block = 
`\n===========================
Signal-Export: ${filename}
Time: ${time}
Count: ${data.length}
---------------------------
${tickers}
===========================\n`;

        fs.appendFileSync(dayFile, block);
        console.log(`📡 Signal-Liste ${filename}.txt (Top 200) aktualisiert.`);
    }
};

module.exports = exportService;