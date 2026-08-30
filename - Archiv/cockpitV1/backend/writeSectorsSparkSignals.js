// analysis/sparksignals/writeSectorsSparkSignals.js

const { sql, config } = require('../../db/connection');
const { updateTileStatus } = require('../../utils/cockpitStatus');

// Deine bestehende Spark-Engine für Sectors
const { getSectorSparkSignal } = require('./sectorSignals');

async function writeSectorsSparkSignals() {
    const start = Date.now();

    try {
        const pool = await sql.connect(config);

        // 1️⃣ Heutiges Datum aus marketScores holen (vom RS-Writer erzeugt)
        const dateResult = await pool.request()
            .query(`
                SELECT TOP 1 CAST(anl_datum AS DATE) AS datum
                FROM trading.dbo.marketScores
                WHERE type = 'sector'
                ORDER BY anl_datum DESC
            `);

        if (dateResult.recordset.length === 0) {
            throw new Error("Keine Sector-Datensätze für heute gefunden.");
        }

        const today = dateResult.recordset[0].datum;

        // 2️⃣ Alle heutigen Sector-Datensätze laden
        const sectorsResult = await pool.request()
            .input('datum', sql.Date, today)
            .query(`
                SELECT name
                FROM trading.dbo.marketScores
                WHERE type = 'sector'
                AND CAST(anl_datum AS DATE) = @datum
            `);

        const sectors = sectorsResult.recordset;

        // 3️⃣ Für jeden Sector Spark-Signal berechnen und marketScores updaten
        for (const sec of sectors) {

            // Sparkline-Engine aufrufen (bestehende Datei!)
            const spark = await getSectorSparkSignal(sec.name);

            await pool.request()
                .input('signal_type', sql.VarChar, spark.signal_type)
                .input('min25', sql.Float, spark.min25)
                .input('max25', sql.Float, spark.max25)
                .input('name', sql.VarChar, sec.name)
                .input('datum', sql.Date, today)
                .query(`
                    UPDATE trading.dbo.marketScores
                    SET signal_type = @signal_type,
                        min25 = @min25,
                        max25 = @max25
                    WHERE type = 'sector'
                    AND name = @name
                    AND CAST(anl_datum AS DATE) = @datum
                `);
        }

        const durationMs = Date.now() - start;
        const duration = `${(durationMs / 1000).toFixed(2)}s`;

        updateTileStatus("Spark_Sectors", {
            status: "success",
            lastRun: new Date().toISOString(),
            duration
        });

        return {
            success: true,
            count: sectors.length,
            message: "Spark-Signale für Sectors erfolgreich ergänzt."
        };

    } catch (err) {
        console.error("❌ Fehler beim Schreiben der Spark-Signale für Sectors:", err);

        updateTileStatus("Spark_Sectors", {
            status: "error",
            lastRun: new Date().toISOString(),
            duration: null,
            error: err.message
        });

        return {
            success: false,
            error: err.message
        };
    }
}

module.exports = { writeSectorsSparkSignals };
