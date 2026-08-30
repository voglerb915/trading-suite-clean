const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { sql, yahooPool, tradingPool } = require('../db/connection');

let isCalculating = false;

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
    if (isCalculating) throw new Error('Signal-Berechnung läuft bereits.');

    try {
        isCalculating = true;
        const yPool = await yahooPool;
        const tPool = await tradingPool;

        logger.info('SIGNAL', 'Starte High-Performance Engine (Update-Signals)...');

        // 1. INDEX-DATEN
        const indexCalculated = {};
        const indices = ['^GSPC', '^GDAXI'];
        for (const idx of indices) {
            const resIdx = await yPool.request().input('i', idx).query(`
                SELECT [Close], [Date] FROM (
                    SELECT [Close], [Date], ROW_NUMBER() OVER (ORDER BY [Date] DESC) as rn 
                    FROM DailyHistory WHERE ticker = @i
                ) t WHERE rn <= 300 ORDER BY [Date] ASC
            `);
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

        // 2. TICKER-LISTE (inkl. US-Sektoren)
        const tickerRes = await tPool.request().query(`SELECT DISTINCT Ticker FROM [trading].[dbo].[finviz] WHERE Industry != 'Exchange Traded Fund'`);
        let tickers = tickerRes.recordset.map(r => r.Ticker);

        const sectorTickers = [
            'XLB', 'XLC', 'XLE', 'XLF', 'XLI', 'XLK', 'XLP', 'XLRE', 'XLU', 'XLV', 'XLY',
            'XRT', 'SOXX', 'IGV', 'KRE', 'XHB', 'XME', 'XBI'
        ];

        for (const sec of sectorTickers) {
            if (!tickers.includes(sec)) {
                tickers.push(sec);
            }
        }

        // Indizes in die Ticker-Liste aufnehmen
        for (const idx of indices) {
            if (!tickers.includes(idx)) {
                tickers.push(idx);
            }
        }

        // 3. LAST SIGNALS
        const lastSigAllRes = await yPool.request().query(`
            SELECT s.ticker, s.date, s.signal_type, s.days_in_trend
            FROM DailySignals s INNER JOIN (SELECT ticker, MAX(date) AS max_date FROM DailySignals GROUP BY ticker) x
            ON s.ticker = x.ticker AND s.date = x.max_date
        `);
        const lastSignalMap = {};
        lastSigAllRes.recordset.forEach(r => lastSignalMap[r.ticker] = r);

        // 4. HISTORY-LOAD
        const allHistoryRes = await yPool.request().query(`
            SELECT ticker, [Close], [Date] FROM (
                SELECT ticker, [Close], [Date], ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY [Date] DESC) as rn
                FROM DailyHistory
            ) t WHERE rn <= 250 ORDER BY ticker, [Date] ASC
        `);
        const fullHistoryMap = {};
        allHistoryRes.recordset.forEach(row => {
            if (!fullHistoryMap[row.ticker]) fullHistoryMap[row.ticker] = [];
            fullHistoryMap[row.ticker].push(row);
        });

        // 6. CHUNK-LOOP
        const chunkSize = 500;
        for (let offset = 0; offset < tickers.length; offset += chunkSize) {
            const chunk = tickers.slice(offset, offset + chunkSize);
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
            table.columns.add('rs_65', sql.Decimal(18,4)); // NEU: Feld für die Einzelstärke (Close / SMA65)
            table.columns.add('dist_sma200', sql.Decimal(18,2));

            const tickersInChunk = []; 

            for (const symbol of chunk) {
                try {
                    const sRecords = fullHistoryMap[symbol];
                    if (!sRecords || sRecords.length < 210) continue;

                    const isIndex = indices.includes(symbol);
                    const indexSymbol = isIndex ? symbol : (symbol.endsWith('.DE') ? '^GDAXI' : '^GSPC');
                    const iStatsMap = indexCalculated[indexSymbol];
                    
                    const lastSig = lastSignalMap[symbol];
                    const lastDate = lastSig?.date;
                    let lastTrend = lastSig?.signal_type || 'EXIT';
                    let trendDays = lastSig?.days_in_trend || 0;

                    let startIndex = lastDate 
                        ? sRecords.findIndex(r => r.Date.getTime() > lastDate.getTime())
                        : sRecords.length - 1;

                    if (startIndex === -1 || startIndex >= sRecords.length) continue;

                    let addedToChunk = false; 

                    for (let i = startIndex; i < sRecords.length; i++) {
                        const currentStock = sRecords[i];
                        const dateKey = currentStock.Date.toISOString().split('T')[0];
                        const curI = iStatsMap[dateKey];
                        if (!curI) continue;

                        const sCloseSlice = sRecords.slice(0, i + 1).map(r => r.Close).reverse();
                        const sma200 = SMA(sCloseSlice, 200);
                        const ema50 = EMA(sCloseSlice, 50);
                        const ema21 = EMA(sCloseSlice, 21);
                        const sma65 = SMA(sCloseSlice, 65);
                        const sma10 = SMA(sCloseSlice, 10);

                        if (sma200 === null || ema50 === null || ema21 === null || sma65 === null || sma10 === null || !curI.sma65 || !curI.sma10) continue;

                        // Berechnung Einzelstärke (Close / SMA65)
                        const rs_65_val = isIndex ? (curI.close / curI.sma65) : (currentStock.Close / sma65);

                        // Berechnung Relative Stärke (Verhältnis zur Benchmark)
                        let rs_slow, rs_fast;
                        if (isIndex) {
                            rs_slow = 1.0;
                            rs_fast = 1.0;
                        } else {
                            rs_slow = rs_65_val / (curI.close / curI.sma65);
                            rs_fast = (currentStock.Close / sma10) / (curI.close / curI.sma10);
                        }

                        if (isNaN(rs_slow) || isNaN(rs_fast) || isNaN(rs_65_val) || !isFinite(rs_slow) || !isFinite(rs_fast) || !isFinite(rs_65_val)) continue;

                        let newTrend = (rs_slow > rs_fast) ? 'LONG' : 'EXIT';
                        let isNew = (newTrend !== lastTrend) ? 1 : 0;
                        trendDays = isNew ? 1 : trendDays + 1;
                        lastTrend = newTrend;

                        table.rows.add(
                            symbol, currentStock.Date, indexSymbol, newTrend,
                            isNew, trendDays, getPhase(currentStock.Close, sma200, ema50, ema21),
                            getPhase(curI.close, curI.sma200, curI.ema50, curI.ema21),
                            rs_slow, rs_fast, rs_65_val, ((currentStock.Close - sma200) / sma200) * 100
                        );
                        addedToChunk = true;
                    }
                    if (addedToChunk) tickersInChunk.push(symbol);
                } catch (err) {
                    logger.error('SIGNAL', `Fehler bei ${symbol}: ${err.message}`);
                }
            }

            if (table.rows.length > 0 && tickersInChunk.length > 0) {
                const request = yPool.request();
                await request.query(`
                    DELETE FROM DailySignals 
                    WHERE ticker IN ('${tickersInChunk.join("','")}') 
                    AND date = (SELECT MAX(date) FROM DailyHistory)
                `);
                await request.bulk(table);
            }
        }

        logger.info("SIGNAL", "Engine abgeschlossen.");
        return { success: true };
    } catch (err) {
        logger.error('SIGNAL', err.message);
        throw err;
    } finally {
        isCalculating = false;
    }
}

module.exports = { runSignalsEngine };