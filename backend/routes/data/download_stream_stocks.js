const express = require("express");
const router = express.Router();
const { sql, yahooPool, tradingPool } = require("../../db/connection");
const axios = require("axios");
const { readStatusFile, writeStatusFile } = require("../../utils/cockpitStatus");

let isDailySyncing = false;

router.get("/stream-daily", async (req, res) => {
    if (isDailySyncing) return res.status(429).send("Sync läuft bereits.");
    isDailySyncing = true;

    // SSE Setup
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.write(":\n\n");

    const send = (event, data) => {
        try {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch {}
    };

    send("progress", { current: 0, total: 0, ticker: null });

    // Status Start
    let status = readStatusFile();
    status.downloads = status.downloads || {};
    status.downloads.DailyHistory = status.downloads.DailyHistory || {};

    status.downloads.DailyHistory.ok = true;
    status.downloads.DailyHistory.lastRun = new Date().toISOString();

    writeStatusFile(status);

    const startTime = Date.now();

    try {
        // Ticker + Indizes
        const result = await tradingPool.request().query(`
            SELECT DISTINCT Ticker AS ticker FROM trading.dbo.finviz
        `);

        let tickers = result.recordset.map(r => r.ticker);
        const indices = ['^GSPC', '^IXIC', '^RUT', '^GDAXI', '^MDAXI', '^SDAXI'];
        tickers = [...new Set([...tickers, ...indices])];

        const total = tickers.length;
        let current = 0;
        const BATCH_SIZE = 10;

        for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
            const batch = tickers.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (symbol) => {
                try {
                    // Prüfen ob Daten existieren → 30 Tage oder 2 Jahre
                    const exists = await yahooPool.request()
                        .input("t", sql.VarChar, symbol)
                        .query(`SELECT TOP 1 1 FROM DailyHistory WHERE ticker = @t`);

                    const range = exists.recordset.length > 0 ? "30d" : "2y";

                    // Yahoo Request
                    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
                    const response = await axios.get(url, {
                        headers: { "User-Agent": "Mozilla/5.0" },
                        timeout: 10000
                    });

                    if (!response.data.chart.result) return;

                    const data = response.data.chart.result[0];
                    const timestamps = data.timestamp;
                    const quote = data.indicators.quote[0];
                    const meta = data.meta;

                    if (!timestamps) return;

                    // 52W Werte aus Yahoo
                    const yahooHigh52w = meta.fiftyTwoWeekHigh || null;
                    const yahooLow52w = meta.fiftyTwoWeekLow || null;

                    // Bulk Insert
                    const reqBulk = yahooPool.request();
                    let sqlValues = [];

                    for (let j = 0; j < timestamps.length; j++) {
                        if (quote.close[j] === null) continue;

                        const dateVal = new Date(timestamps[j] * 1000).toISOString().split("T")[0];

                        reqBulk.input(`dat${j}`, sql.Date, dateVal);
                        reqBulk.input(`cls${j}`, sql.Decimal(18, 4), quote.close[j]);
                        reqBulk.input(`opn${j}`, sql.Decimal(18, 4), quote.open[j]);
                        reqBulk.input(`hi${j}`, sql.Decimal(18, 4), quote.high[j]);
                        reqBulk.input(`lo${j}`, sql.Decimal(18, 4), quote.low[j]);
                        reqBulk.input(`vol${j}`, sql.BigInt, quote.volume[j] || 0);

                        // 52W Werte pro Tag (Yahoo liefert nur aktuelle Werte → wir übernehmen sie)
                        reqBulk.input(`h52${j}`, sql.Decimal(18, 4), yahooHigh52w);
                        reqBulk.input(`l52${j}`, sql.Decimal(18, 4), yahooLow52w);

                        sqlValues.push(`(@ticker, @dat${j}, @cls${j}, @opn${j}, @hi${j}, @lo${j}, @vol${j}, @name, @h52${j}, @l52${j}, GETDATE())`);
                    }

                    if (sqlValues.length > 0) {
                        reqBulk.input("ticker", sql.VarChar, symbol);
                        reqBulk.input("name", sql.NVarChar, meta.longName || symbol);

                        await reqBulk.query(`
                            INSERT INTO DailyHistory 
                            (ticker, [date], [close], [open], high, low, volume, name, high52w, low52w, created_at)
                            SELECT v.t, v.d, v.c, v.o, v.h, v.l, v.vol, v.n, v.h52, v.l52, v.cr
                            FROM (VALUES ${sqlValues.join(",")}) AS v(t, d, c, o, h, l, vol, n, h52, l52, cr)
                            WHERE NOT EXISTS (
                                SELECT 1 FROM DailyHistory h 
                                WHERE h.ticker = v.t AND h.[date] = v.d
                            )
                        `);
                    }

                } catch (err) {
                    console.error(`Fehler bei ${symbol}:`, err.message);
                }
            }));

            current += batch.length;
            send("progress", { current, total, ticker: batch[batch.length - 1] });

            await new Promise(r => setTimeout(r, 100));
        }

        // Fertig
        send("done", { message: "Fertig." });

        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);

        const statusEnd = readStatusFile();
        statusEnd.downloads = statusEnd.downloads || {};
        statusEnd.downloads.DailyHistory = statusEnd.downloads.DailyHistory || {};

        statusEnd.downloads.DailyHistory.ok = true;
        statusEnd.downloads.DailyHistory.lastRun = new Date().toISOString();
        statusEnd.downloads.DailyHistory.duration = `${duration}s`;
        statusEnd.downloads.DailyHistory.info = "Erfolgreich";

        writeStatusFile(statusEnd);

        res.end();

    } catch (err) {
        console.error("GLOBALER FEHLER:", err.message);
        send("error", { message: err.message });

        const duration = Math.round((Date.now() - startTime) / 1000);
        status.downloads.DailyHistory = {
            ok: false,
            lastRun: new Date().toISOString(),
            duration: `${duration}s`,
            error: err.message
        };
        writeStatusFile(status);

        res.end();
    } finally {
        isDailySyncing = false;
    }
});

module.exports = router;
