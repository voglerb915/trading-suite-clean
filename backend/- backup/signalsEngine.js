const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
//const exportService = require('../utils/exportService');
const { sql, yahooPool, tradingPool } = require('../db/connection');
// const startTime = Date.now();

let isCalculating = false;

// ------------------------------------------------------
// Backend-Helfer für Tile-Status (nutzt natives Fetch)
// ------------------------------------------------------
async function saveBackendTileStatus(tile, payload) {
    try {
        const body = JSON.stringify(payload);

        await fetch(`http://localhost:4000/api/system/cockpit/${tile}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            },
            body
        });
    } catch (err) {
        logger.error("SIGNAL", "Tile-Status konnte nicht gespeichert werden: " + err.message);
    }
}

// --- Helfer-Funktionen ---
const SMA = (data, period) => {
    if (!data || data.length < period) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i];
    return sum / period;
};

const EMA = (data, period) => {
    if (!data || data.length < period) return null;
    const k = 2 / (period + 1);
    let ema = data[data.length - 1]; 
    for (let i = data.length - 2; i >= 0; i--) {
        ema = data[i] * k + ema * (1 - k);
    }
    return ema;
};

function getPhase(close, sma200, ema50, ema21) {
    if (!sma200 || !ema50 || !ema21) return "0"; 
    if (sma200 > close && close > ema21) return "1";
    if (close > sma200 && sma200 > ema50) return "2";
    if (close > ema50 && ema50 > sma200) return "3";
    if (ema50 > close && close > sma200) return "4";
    if (ema50 > sma200 && sma200 > close) return "5";
    if (sma200 > ema21 && ema21 > close) return "6";
    return "0";
}

async function runSignalsEngine() {
    if (isCalculating) {
        throw new Error('Signal-Berechnung läuft bereits.');
    }

    const startTime = Date.now();

    try {
        isCalculating = true;
        const yPool = await yahooPool;
        const tPool = await tradingPool;

        logger.info('SIGNAL', 'Starte High-Performance Engine (Update-Signals)...');

        // Tile-Status: Engine startet
        await saveBackendTileStatus("calculations", {
            Signals: {
                status: "running",
                lastRun: new Date(),
                duration: "–"
            }
        });


        // 1. INDEX-DATEN VORBEREITEN (Einmal berechnen für alle Ticker)
        const indexCalculated = {};
        const indices = ['^GSPC', '^GDAXI'];
        for (const idx of indices) {
            const resIdx = await yPool.request().input('i', idx).query(
                "SELECT [Close], [Date] FROM DailyHistory WHERE ticker = @i ORDER BY [Date] ASC"
            );
            const data = resIdx.recordset;
            const statsMap = {};
            
            for (let i = 199; i < data.length; i++) {
                const slice = data.slice(0, i + 1).map(r => r.Close).reverse();
                const dateKey = data[i].Date.toISOString().split('T')[0];

                statsMap[dateKey] = {
                    close: data[i].Close,
                    sma200: SMA(slice, 200),
                    ema50: EMA(slice, 50),
                    ema21: EMA(slice, 21),

                    sma65: SMA(slice, 65),
                    sma10: SMA(slice, 10)
                };
            }

            indexCalculated[idx] = statsMap;
        }

        // 2. TICKER-LISTE (OHNE ETFs)
        const tickerRes = await tPool.request().query(`
            SELECT DISTINCT Ticker FROM [trading].[dbo].[finviz] 
            WHERE Industry != 'Exchange Traded Fund'
        `);
        const tickers = tickerRes.recordset.map(r => r.Ticker);

        // 3. ALLE LETZTEN SIGNALE LADEN
        const lastSigAllRes = await yPool.request().query(`
            SELECT s.ticker, s.date, s.signal_type, s.days_in_trend
            FROM DailySignals s
            INNER JOIN (SELECT ticker, MAX(date) AS max_date FROM DailySignals GROUP BY ticker) x
            ON s.ticker = x.ticker AND s.date = x.max_date
        `);
        const lastSignalMap = {};
        lastSigAllRes.recordset.forEach(r => {
            lastSignalMap[r.ticker] = r;
        });

    // 4. CHUNKING (RAM SCHONEN)

    // 🔥 DailyHistory EINMAL laden (statt pro Chunk)
    const allHistoryRes = await yPool.request().query(`
        SELECT ticker, [Close], [Date] 
        FROM DailyHistory
        ORDER BY ticker, [Date] ASC
    `);

    const fullHistoryMap = {};
    allHistoryRes.recordset.forEach(row => {
        if (!fullHistoryMap[row.ticker]) fullHistoryMap[row.ticker] = [];
        fullHistoryMap[row.ticker].push(row);
    });

    // 🔥 Chunk-Schleife bleibt wie sie ist
    const chunkSize = 500;   // vorher 1000
    for (let offset = 0; offset < tickers.length; offset += chunkSize) {
        const chunk = tickers.slice(offset, offset + chunkSize);
        logger.info('SIGNAL', `Verarbeite Chunk: ${offset} bis ${offset + chunk.length}`);

        // 🔥 KEIN SQL mehr hier — wir nutzen die vorbereitete Map
        const historyMap = {};
        for (const t of chunk) {
            historyMap[t] = fullHistoryMap[t] || [];
        }

        // 5. DER OPTIMIERTE LOOP
        for (const symbol of chunk) {
            try {
                const sRecords = historyMap[symbol];
                if (!sRecords || sRecords.length < 210) continue;

                const indexSymbol = symbol.endsWith('.DE') ? '^GDAXI' : '^GSPC';
                const iStatsMap = indexCalculated[indexSymbol];
                
                const lastSig = lastSignalMap[symbol];
                const lastDate = lastSig?.date;
                let lastTrend = lastSig?.signal_type || 'EXIT';
                let trendDays = lastSig?.days_in_trend || 0;

                let startIndex = lastDate 
                    ? sRecords.findIndex(r => r.Date.getTime() > lastDate.getTime())
                    : sRecords.length - 1;

                if (startIndex === -1 || startIndex >= sRecords.length) continue;

                let batchRows = [];
                for (let i = startIndex; i < sRecords.length; i++) {
                    const currentStock = sRecords[i];
                    const dateKey = currentStock.Date.toISOString().split('T')[0];
                    const curI = iStatsMap[dateKey];

                    if (!curI) continue;

                    const sCloseSlice = sRecords.slice(0, i + 1).map(r => r.Close).reverse();
                    const sma200 = SMA(sCloseSlice, 200);
                    const ema50 = EMA(sCloseSlice, 50);
                    const ema21 = EMA(sCloseSlice, 21);

                    // RS-Berechnung OHNE Filter (blitzschnell)
                    const rs_slow = (currentStock.Close / SMA(sCloseSlice, 65)) / (curI.close / curI.sma65);
                    const rs_fast = (currentStock.Close / SMA(sCloseSlice, 10)) / (curI.close / curI.sma10);

                    let newTrend = (rs_slow > rs_fast) ? 'LONG' : 'EXIT';
                    let isNew = (newTrend !== lastTrend) ? 1 : 0;
                    trendDays = isNew ? 1 : trendDays + 1;
                    lastTrend = newTrend;

                    batchRows.push({
                        ticker: symbol,
                        date: currentStock.Date,
                        ref_index_symbol: indexSymbol,
                        signal_type: newTrend,
                        is_new_signal: isNew,
                        days_in_trend: trendDays,
                        phase_stock: getPhase(currentStock.Close, sma200, ema50, ema21),
                        phase_index: getPhase(curI.close, curI.sma200, curI.ema50, curI.ema21),
                        rs_slow, rs_fast,
                        dist_sma200: ((currentStock.Close - sma200) / sma200) * 100
                    });
                }

                // 6. BULK INSERT PRO TICKER
                if (batchRows.length > 0) {
                    const table = new sql.Table('DailySignals');
                    table.create = false;
                    table.columns.add('ticker', sql.NVarChar(50), { nullable: false });
                    table.columns.add('date', sql.Date, { nullable: false });
                    table.columns.add('ref_index_symbol', sql.NVarChar(50));
                    table.columns.add('signal_type', sql.NVarChar(10));
                    table.columns.add('is_new_signal', sql.Bit);
                    table.columns.add('days_in_trend', sql.Int);
                    table.columns.add('phase_stock', sql.NVarChar(10));
                    table.columns.add('phase_index', sql.NVarChar(10));
                    table.columns.add('rs_slow', sql.Decimal(18,4));
                    table.columns.add('rs_fast', sql.Decimal(18,4));
                    table.columns.add('dist_sma200', sql.Decimal(18,2));

                    batchRows.forEach(r => table.rows.add(
                        r.ticker, r.date, r.ref_index_symbol, r.signal_type,
                        r.is_new_signal, r.days_in_trend, r.phase_stock,
                        r.phase_index, r.rs_slow, r.rs_fast, r.dist_sma200
                    ));

                    const tradingDate = batchRows[0].date;

                    await yPool.request()
                        .input('d', sql.Date, tradingDate)
                        .query("DELETE FROM DailySignals WHERE date = @d");

                    await yPool.request().bulk(table);
                }

            } catch (err) {
                logger.error('SIGNAL', `Fehler bei ${symbol}: ${err.message}`);
            }
        }
    }

        /* // --- EXPORT (Wie gehabt) ---
        const finalDateRes = await yPool.request().query("SELECT MAX(date) as d FROM DailySignals");
        const lastSignalDate = finalDateRes.recordset[0].d;

        if (lastSignalDate) {
            const tradingDateStr = new Date(lastSignalDate).toISOString().split('T')[0];
            const exportConfig = [
                { type: 'LONG', file: 'long_signals' },
                { type: 'EXIT', file: 'exit_signals' }
            ];

            for (const cfg of exportConfig) {
                const sigs = (await yPool.request().input('d', sql.Date, lastSignalDate).query(`
                    SELECT TOP 200 ticker, days_in_trend, rs_slow 
                    FROM DailySignals 
                    WHERE date = @d AND signal_type = '${cfg.type}' 
                    ORDER BY days_in_trend ASC, rs_slow DESC
                `)).recordset;

                // Export optional (falls auskommentiert)
                if (typeof exportService?.generate === "function") {
                    await exportService.generate(
                        'TV_SIGNALS',
                        {
                            header: [
                                `# YAHOO TOP 200 ${cfg.type} - ${tradingDateStr}`,
                                `# Sort: Frische & Stärke`
                            ],
                            data: sigs
                        },
                        { filename: cfg.file }
                    );
                }
            }
        }
        */
        logger.info("SIGNAL", "Engine abgeschlossen.");

        // Tile-Status: Engine erfolgreich beendet
        await saveBackendTileStatus("calculations", {
            Signals: {
                status: "success",
                lastRun: new Date(),
                duration: ((Date.now() - startTime) / 1000).toFixed(1) + "s"
            }
        });

        return { success: true, message: "Abgeschlossen." };

        } catch (err) {
            logger.error('SIGNAL', err.message);

            // Tile-Status: Fehler
            await saveBackendTileStatus("calculations", {
                Signals: {
                    status: "error",
                    lastRun: new Date(),
                    duration: "–"
                }
            });

            throw err;

        } finally {
            isCalculating = false;
        }

}

module.exports = { runSignalsEngine };
