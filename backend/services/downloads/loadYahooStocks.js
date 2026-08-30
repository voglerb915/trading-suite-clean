const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../../utils/logger');
const { sql, yahooPool, tradingPool } = require('../../db/connection');
const fs = require('fs');
const os = require('os');
const path = require('path');

let isSyncing = false;

// Pfad zur Host-basierten Status-Datei
function getStatusFilePath() {
    const host = os.hostname().replace(/[^a-zA-Z0-9_-]/g, "");
    return path.join(__dirname, "..", "cockpit_status_" + host + ".json");
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

// Hintergrundprozess
async function runBackgroundSync(symbols, yPool) {
    const start = performance.now();
    let ok = true;

    try {
        for (const symbol of symbols) {
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`;
                const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

                const resData = response.data?.chart?.result?.[0];
                if (!resData) continue;

                const timestamps = resData.timestamp;
                const quote = resData.indicators?.quote?.[0];
                if (!timestamps || !quote) continue;

                const meta = resData.meta;

                for (let i = 0; i < timestamps.length; i++) {
                    const tradingDate = new Date(timestamps[i] * 1000).toISOString().split('T')[0];

                    const close = quote.close ? quote.close[i] : null;
                    const open = quote.open ? quote.open[i] : null;
                    const high = quote.high ? quote.high[i] : null;
                    const low = quote.low ? quote.low[i] : null;
                    const volume = quote.volume ? quote.volume[i] : null;

                    if (close === null || close === undefined) continue;

                    await yPool.request()
                        .input('sym', sql.NVarChar, symbol)
                        .input('dat', sql.Date, tradingDate)
                        .input('cls', sql.Decimal(18, 4), close)
                        .input('open', sql.Decimal(18, 4), open)
                        .input('high', sql.Decimal(18, 4), high)
                        .input('low', sql.Decimal(18, 4), low)
                        .input('vol', sql.BigInt, volume)
                        .input('h52', sql.Decimal(18, 4), meta.fiftyTwoWeekHigh || null)
                        .input('l52', sql.Decimal(18, 4), meta.fiftyTwoWeekLow || null)
                        .input('curr', sql.NVarChar, meta.currency || 'USD')
                        .input('name', sql.NVarChar, meta.longName || symbol)
                        .input('raw', sql.NVarChar(sql.MAX), JSON.stringify(resData))
                        .query(`
                            IF NOT EXISTS (SELECT 1 FROM DailyHistory WHERE ticker = @sym AND [date] = @dat)
                            INSERT INTO DailyHistory (ticker, [date], [close], [open], high, low, volume, high52w, low52w, currency, name, raw_data, created_at)
                            VALUES (@sym, @dat, @cls, @open, @high, @low, @vol, @h52, @l52, @curr, @name, @raw, GETDATE())
                            ELSE
                            UPDATE DailyHistory SET 
                                [close] = @cls, 
                                [open] = @open, 
                                high = @high, 
                                low = @low, 
                                volume = @vol, 
                                high52w = @h52,
                                low52w = @l52,
                                created_at = GETDATE()
                            WHERE ticker = @sym AND [date] = @dat
                        `);
                }

                await new Promise(resolve => setTimeout(resolve, 150));

            } catch (innerErr) {
                ok = false;
                console.error(`Fehler bei ${symbol}:`, innerErr.message);
            }
        }

    } catch (err) {
        ok = false;
        logger.error('YAHOO', 'Kritischer Fehler im Hintergrund-Sync: ' + err.message);
    } finally {
        isSyncing = false;

        const duration = ((performance.now() - start) / 1000).toFixed(2) + "s";

        writeStatus("DailyHistory", {
            ok,
            lastRun: new Date().toISOString(),
            duration
        });

        console.log('🏁 Yahoo-Download DailyHistory beendet.');
    }
}

// Neue Route
router.get('/loadYahooStocks', async (req, res) => {
    if (isSyncing) {
        return res.status(429).json({ success: false, message: 'Sync läuft bereits.' });
    }

    try {
        const yPool = await yahooPool;
        const tPool = await tradingPool;

        const tickerResult = await tPool.request().query("SELECT DISTINCT Ticker FROM [trading].[dbo].[finviz]");
        let symbols = tickerResult.recordset.map(r => r.Ticker);

        const indices = ['^GSPC', '^IXIC', '^RUT', '^GDAXI', '^MDAXI', '^SDAXI'];
        symbols = [...new Set([...symbols, ...indices])];

        isSyncing = true;

        runBackgroundSync(symbols, yPool);

        res.json({
            success: true,
            message: `DailyHistory-Download für ${symbols.length} Ticker gestartet.`
        });

    } catch (err) {
        isSyncing = false;
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
