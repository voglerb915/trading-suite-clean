const fs = require('fs');

function convertExcelCsvToImport(inputFile, outputFile) {
    if (!fs.existsSync(inputFile)) {
        console.log(`Datei nicht gefunden: ${inputFile}`);
        return;
    }

    const content = fs.readFileSync(inputFile, 'utf8');
    const lines = content.split(/\r?\n/);

    if (lines.length === 0 || lines[0].trim() === '') return;

    const firstLine = lines[0];
    const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
    console.log(`Erkanntes Trennzeichen der Excel-CSV: "${sep === ';' ? 'Semikolon (;)' : 'Komma (,)'}"`);

    const timestamp = '2026-08-06 22:15:01.000';
    const outSep = ',';

    const parseCsvLine = (line) => {
        let cols = [];
        let current = '';
        let inQuotes = false;
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === sep && !inQuotes) {
                cols.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        cols.push(current.trim().replace(/^"|"$/g, ''));
        return cols;
    };

    const csvHeaderCols = parseCsvLine(lines[0]);
    console.log(`Gefundene Spalten in der Excel-CSV: ${csvHeaderCols.length}`);

    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const headerMap = {};
    csvHeaderCols.forEach((colName, index) => {
        headerMap[normalize(colName)] = index;
    });

    // Exakte Reihenfolge deiner Datenbank-Tabelle
    const dbColumns = [
        'no', 'ticker', 'company', 'index', 'sector', 'industry', 'country',
        'market_cap', 'p_e', 'fwd_p_e', 'peg', 'p_s', 'p_b', 'p_c', 'p_fcf', 'book_sh', 'cash_sh',
        'dividend', 'dividend_percent', 'payout_ratio', 'eps', 'eps_next_q', 'eps_this_y',
        'eps_next_y', 'eps_past_5y', 'eps_next_5y', 'sales_past_5y', 'sales_q_q', 'eps_q_q',
        'sales', 'income', 'outstanding', 'float', 'float_percent', 'insider_own', 'insider_trans',
        'inst_own', 'inst_trans', 'float_short', 'short_ratio', 'short_interest', 'roa', 'roe',
        'roi', 'curr_r', 'quick_r', 'ltdebt_eq', 'debt_eq', 'gross_m', 'oper_m', 'profit_m',
        'perf_week', 'perf_month', 'perf_quart', 'perf_half', 'perf_year', 'perf_ytd',
        'beta', 'atr', 'volatility_w', 'volatility_m', 'sma20', 'sma50', 'sma200',
        '_50d_high', '_50d_low', '_52w_high', '_52w_low', 'rsi', 'earnings', 'ipo_date',
        'optionable', 'shortable', 'employees', 'from_open', 'gap', 'recom', 'avg_volume',
        'rel_volume', 'volume', 'target_price', 'prev_close', 'price', 'change',
        'ah_close', 'ah_change'
    ];

    const newHeader = ['anl_datum', ...dbColumns].join(outSep);
    const newLines = [newHeader];

    const cleanNum = (val) => {
        if (!val || val === '-' || val === '' || val === 'nan') return '0';
        return val.replace(/%/g, '').replace(/,/g, '');
    };

    const cleanStr = (val) => {
        if (!val || val === '-' || val === '') return '""';
        return `"${val.replace(/"/g, '""')}"`;
    };

    const isTextCol = (colName) => {
        const textCols = ['ticker', 'company', 'index', 'sector', 'industry', 'country', 'earnings', 'ipo_date', 'optionable', 'shortable'];
        return textCols.includes(colName);
    };

    let processedCount = 0;

    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        let cols = parseCsvLine(line);
        if (cols.length < 5) continue;

        let rowData = [`"${timestamp}"`];

        dbColumns.forEach(dbCol => {
            let colIndex = findExcelHeaderIndex(dbCol, headerMap, normalize);
            let val = (colIndex !== -1 && cols[colIndex] !== undefined) ? cols[colIndex] : '';

            if (isTextCol(dbCol)) {
                rowData.push(cleanStr(val));
            } else {
                rowData.push(cleanNum(val));
            }
        });

        newLines.push(rowData.join(outSep));
        processedCount++;
    }

    fs.writeFileSync(outputFile, newLines.join('\n'), 'utf8');
    console.log(`Import-CSV aus Excel erfolgreich generiert: ${outputFile} (${processedCount} Zeilen)`);
}

function findExcelHeaderIndex(dbCol, headerMap, normalize) {
    if (headerMap[normalize(dbCol)] !== undefined) {
        return headerMap[normalize(dbCol)];
    }

    // Gleiche Alias-Tabelle wie im Finviz-Transformer, falls Excel andere Spaltennamen hat
    const aliases = {
        'market_cap': ['marketcap', 'cap'],
        'p_e': ['pe', 'pricetoearnings'],
        'fwd_p_e': ['fwdpe', 'forwardpe'],
        'p_s': ['ps', 'pricetosales'],
        'p_b': ['pb', 'pricetobook'],
        'dividend_percent': ['dividend', 'divpercent', 'yield', 'dividendyield'],
        'payout_ratio': ['payout'],
        'eps': ['epsttm', 'eps'],
        'perf_week': ['perfweek', 'performanceweek'],
        'perf_month': ['perfmonth', 'performancemonth'],
        'perf_quart': ['perfquart', 'performancequart', 'performancequarter'],
        'perf_half': ['perfhalf', 'performancehalf', 'performancehalfyear'],
        'perf_year': ['perfyear', 'performanceyear'],
        'perf_ytd': ['perfytd', 'performanceytd'],
        'no': ['no', 'number']
    };

    let possibleAliases = aliases[dbCol] || [];
    for (let alias of possibleAliases) {
        if (headerMap[alias] !== undefined) {
            return headerMap[alias];
        }
    }

    return -1;
}

convertExcelCsvToImport('excel_export.csv', 'finviz_stocks_import.csv');