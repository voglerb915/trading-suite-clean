console.log("SSE ROUTE GELADEN");

const express = require("express");
const router = express.Router();
const { sql, yahooPool } = require("../../db/connection");
const axios = require("axios");
const { readStatusFile, writeStatusFile } = require("../../utils/cockpitStatus");

router.get("/stream", async (req, res) => {
    const startTime = Date.now();
    console.log("SSE STREAM AUFGERUFEN");

    // SSE Header
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (res.flushHeaders) res.flushHeaders();

    function sendEvent(event, data) {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    // ------------------------------------------------------
    // 🔥 STARTBLOCK – setzt KEINE duration
    // ------------------------------------------------------
    let status = readStatusFile();
    status.downloads = status.downloads || {};
    status.downloads.IndexHistory = status.downloads.IndexHistory || {};

    status.downloads.IndexHistory.ok = true;
    status.downloads.IndexHistory.lastRun = new Date().toISOString();
    // ❗ duration NICHT setzen – Endblock macht das

    writeStatusFile(status);

    // ------------------------------------------------------

    let globalError = null;
    let errorCount = 0;

    try {
        const result = await yahooPool.request().query(`
            SELECT index_id, ticker FROM indices WHERE yahoo_available = 1
        `);

        const indices = result.recordset;
        const total = indices.length;
        let current = 0;

        const BATCH_SIZE = 10;

        for (let i = 0; i < indices.length; i += BATCH_SIZE) {
            const batch = indices.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (row) => {
                try {
                    // Prüfen ob Daten existieren → 30 Tage oder 2 Jahre
                    const exists = await yahooPool.request()
                        .input("idx", sql.Int, row.index_id)
                        .query(`SELECT TOP 1 1 FROM IndexHistory WHERE index_id = @idx`);

                    const range = exists.recordset.length > 0 ? "30d" : "2y";

                    // Yahoo Request
                    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(row.ticker)}?range=${range}&interval=1d`;
                    const response = await axios.get(url, {
                        headers: { "User-Agent": "Mozilla/5.0" },
                        timeout: 10000
                    });


                    if (!response.data.chart.result) return;

                    const resData = response.data.chart.result[0];
                    const timestamps = resData.timestamp;
                    const quote = resData.indicators.quote[0];
                    const adjClose = resData.indicators.adjclose
                        ? resData.indicators.adjclose[0].adjclose
                        : quote.close;

                    if (!timestamps) return;

                    // BULK-INSERT statt 500 MERGEs
                    const reqBulk = yahooPool.request();
                    let sqlValues = [];

                    for (let j = 0; j < timestamps.length; j++) {
                        if (quote.close[j] === null) continue;

                        const dateVal = new Date(timestamps[j] * 1000).toISOString().split("T")[0];

                        reqBulk.input(`dat${j}`, sql.Date, dateVal);
                        reqBulk.input(`cls${j}`, sql.Decimal(18, 4), quote.close[j]);
                        reqBulk.input(`adj${j}`, sql.Decimal(18, 4), adjClose[j]);
                        reqBulk.input(`opn${j}`, sql.Decimal(18, 4), quote.open[j]);
                        reqBulk.input(`hi${j}`, sql.Decimal(18, 4), quote.high[j]);
                        reqBulk.input(`lo${j}`, sql.Decimal(18, 4), quote.low[j]);
                        reqBulk.input(`vol${j}`, sql.BigInt, quote.volume[j] || 0);

                        sqlValues.push(`(@idx, @dat${j}, @cls${j}, @adj${j}, @opn${j}, @hi${j}, @lo${j}, @vol${j})`);
                    }

                    if (sqlValues.length > 0) {
                        reqBulk.input("idx", sql.Int, row.index_id);

                        await reqBulk.query(`
                            INSERT INTO IndexHistory (index_id, [date], [close], adj_close, [open], high, low, volume)
                            SELECT v.idx, v.d, v.c, v.a, v.o, v.h, v.l, v.v
                            FROM (VALUES ${sqlValues.join(",")}) AS v(idx, d, c, a, o, h, l, v)
                            WHERE NOT EXISTS (
                                SELECT 1 FROM IndexHistory h
                                WHERE h.index_id = v.idx AND h.[date] = v.d
                            )
                        `);
                    }

                } catch (err) {
                    errorCount++;
                    console.error(`Fehler bei ${row.ticker}:`, err.message);
                    sendEvent("error", { ticker: row.ticker, message: err.message });
                }
            }));

            current += batch.length;
            sendEvent("progress", { current, total, ticker: batch[batch.length - 1].ticker });
        }

        sendEvent("done", { message: "Download abgeschlossen." });

    } catch (err) {
        globalError = err.message;
        console.error("GLOBALER FEHLER:", err);
        sendEvent("error", { message: err.message });
    }

    // ------------------------------------------------------
    // 🔥 FINALBLOCK – setzt IMMER die Dauer
    // ------------------------------------------------------
    const endTime = Date.now();
    const finalDuration = Math.round((endTime - startTime) / 1000);

    let finalStatus = readStatusFile();
    finalStatus.downloads = finalStatus.downloads || {};
    finalStatus.downloads.IndexHistory = finalStatus.downloads.IndexHistory || {};

    finalStatus.downloads.IndexHistory.ok = !globalError;
    finalStatus.downloads.IndexHistory.lastRun = new Date().toISOString();
    finalStatus.downloads.IndexHistory.duration = `${finalDuration}s`;
    finalStatus.downloads.IndexHistory.info =
        errorCount > 0 ? `${errorCount} Fehler übersprungen` : "Erfolgreich";

    writeStatusFile(finalStatus);

    console.log(`Fertig! Dauer: ${finalDuration}s`);

    res.end();
});

module.exports = router;
