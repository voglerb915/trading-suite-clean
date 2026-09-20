const sql = require('mssql');
const { config } = require('../../db/connection'); // Pfad ggf. anpassen an deinen Projektpfad

async function runSmaBackfill() {
    let pool;
    const startTime = Date.now();

    try {
        console.log('[BACKFILL] Verbinde mit der Datenbank...');
        pool = await sql.connect(config);

        // 1. Hole die letzten 100 eindeutigen Handelstage (absteigend)
        console.log('[BACKFILL] Ermittle die letzten 100 Handelstage...');
        const datesResult = await pool.request().query(`
            SELECT DISTINCT TOP 100 CAST([date] AS DATE) AS [date]
            FROM yahoo.dbo.DailyHistory
            ORDER BY [date] DESC
        `);

        // Umkehren, damit chronologisch von alt nach neu gearbeitet wird
        const dates = datesResult.recordset.map(r => r.date).reverse();
        console.log(`[BACKFILL] Gestartet für ${dates.length} Handelstage.`);

        // 2. Schleife über jeden Handelstag
        for (let i = 0; i < dates.length; i++) {
            const targetDate = dates[i];
            const dateStr = targetDate.toISOString().split('T')[0];
            const loopStart = Date.now();

            // 3. Set-basierte Berechnung & Upsert via MERGE direkt in SQL Server
            // Das berechnet den SMA200 für alle Ticker an diesem Tag und schreibt ihn verlustfrei weg.
            const mergeQuery = `
                MERGE yahoo.dbo.StockMetrics AS target
                USING (
                    SELECT
                        h.ticker,
                        CAST(h.[date] AS DATE) AS [date],
                        (
                            SELECT AVG(CAST([close] AS FLOAT))
                            FROM (
                                SELECT TOP 200 [close]
                                FROM yahoo.dbo.DailyHistory h3
                                WHERE h3.ticker = h.ticker
                                  AND CAST(h3.[date] AS DATE) <= CAST(h.[date] AS DATE)
                                ORDER BY h3.[date] DESC
                            ) smaSub
                        ) AS sma200
                    FROM yahoo.dbo.DailyHistory h
                    WHERE CAST(h.[date] AS DATE) = @targetDate
                ) AS source
                ON target.ticker = source.ticker AND target.[date] = source.[date]
                WHEN MATCHED THEN
                    UPDATE SET target.sma200 = source.sma200
                WHEN NOT MATCHED THEN
                    INSERT (ticker, [date], sma200, last_updated)
                    VALUES (source.ticker, source.[date], source.sma200, GETDATE());
            `;

            const request = pool.request();
            request.input('targetDate', sql.Date, targetDate);
            await request.query(mergeQuery);

            const duration = ((Date.now() - loopStart) / 1000).toFixed(2);
            console.log(`[BACKFILL] [${i + 1}/${dates.length}] Datum ${dateStr} verarbeitet in ${duration}s`);
        }

        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[BACKFILL] Erfolgreich abgeschlossen! Gesamtdauer: ${totalDuration}s`);

    } catch (err) {
        console.error('[BACKFILL] Fehler aufgetreten:', err.message);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

runSmaBackfill();