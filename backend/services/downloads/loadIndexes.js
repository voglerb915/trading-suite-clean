const axios = require("axios");
const { sql, yahooPool } = require("../../db/connection");

async function loadIndexes() {
    const start = performance.now();
    const logs = [];

    try {
        logs.push("Verbindung zur Yahoo-Datenbank hergestellt.");

        const result = await yahooPool.request().query(`
            SELECT index_id, ticker FROM indices
        `);

        const indices = result.recordset;

        for (const row of indices) {
            const { index_id, ticker } = row;
            logs.push(`Lade ${ticker} (ID: ${index_id})...`);

            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=2y&interval=1d`;
                const response = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });

                if (!response.data.chart.result) {
                    logs.push(`⚠️ Keine Daten für ${ticker}`);
                    continue;
                }

                const res = response.data.chart.result[0];
                const timestamps = res.timestamp;
                const quote = res.indicators.quote[0];
                const adjClose = res.indicators.adjclose ? res.indicators.adjclose[0].adjclose : quote.close;

                if (!timestamps) continue;

                for (let i = 0; i < timestamps.length; i++) {
                    if (quote.close[i] === null) continue;

                    const dateVal = new Date(timestamps[i] * 1000).toISOString().split("T")[0];

                    await yahooPool.request()
                        .input("idxId", sql.Int, index_id)
                        .input("dat", sql.Date, dateVal)
                        .input("cls", sql.Decimal(18, 4), quote.close[i])
                        .input("adj", sql.Decimal(18, 4), adjClose[i])
                        .input("opn", sql.Decimal(18, 4), quote.open[i])
                        .input("hi", sql.Decimal(18, 4), quote.high[i])
                        .input("lo", sql.Decimal(18, 4), quote.low[i])
                        .input("vol", sql.BigInt, quote.volume[i] || 0)
                        .query(`
                            MERGE INTO IndexHistory AS target
                            USING (SELECT @idxId AS index_id, @dat AS [date]) AS source
                            ON (target.index_id = source.index_id AND target.[date] = source.[date])
                            WHEN MATCHED THEN
                                UPDATE SET 
                                    [close] = @cls, 
                                    adj_close = @adj, 
                                    [open] = @opn, 
                                    high = @hi, 
                                    low = @lo, 
                                    volume = @vol
                            WHEN NOT MATCHED THEN
                                INSERT (index_id, [date], [close], adj_close, [open], high, low, volume)
                                VALUES (@idxId, @dat, @cls, @adj, @opn, @hi, @lo, @vol);
                        `);
                }

                logs.push(`✔️ ${ticker} erfolgreich importiert.`);
            } catch (err) {
                logs.push(`❌ Fehler bei ${ticker}: ${err.message}`);
            }
        }

        const duration = ((performance.now() - start) / 1000).toFixed(2) + "s";

        return { ok: true, logs, duration };

    } catch (err) {
        return { ok: false, logs: [`Fehler: ${err.message}`], duration: "0s" };
    }
}

module.exports = { loadIndexes };
