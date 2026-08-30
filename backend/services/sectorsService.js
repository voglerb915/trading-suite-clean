const { tradingConnect } = require("../db/connection");
const sql = require("mssql");

async function getSectorsForList() {
    try {
        const pool = await tradingConnect;

        // 1. Das neueste ANALYSE-Datum für Sektoren holen (Typ 'sector')
        const dateResult = await pool.request().query(`
            SELECT CONVERT(VARCHAR(10), MAX(anl_datum), 120) AS max_date
            FROM marketScores WITH (NOLOCK)
            WHERE type = 'sector'
            OPTION (RECOMPILE);
        `);
        
        const latestDate = dateResult.recordset[0]?.max_date;
        if (!latestDate) return [];

        const request = pool.request();
        request.input("targetDate", sql.VarChar(10), latestDate);

        // 2. Hauptabfrage: SARGable Zeitfenster über @start und @end
        const result = await request.query(`
            DECLARE @start DATETIME = CAST(@targetDate AS DATETIME);
            DECLARE @end DATETIME = DATEADD(day, 1, @start);

            SELECT
                ms.name        AS sector,
                ms.score       AS rsScore,
                ms.rank_db     AS rsRank,
                ms.diffW,
                ms.diffM,
                ms.diffQ            
            FROM marketScores ms WITH (NOLOCK)
            WHERE ms.type = 'sector'
              -- Perfekter Index-Seek über das Zeitfenster
              AND ms.anl_datum >= @start AND ms.anl_datum < @end
            ORDER BY ms.rank_db ASC
            OPTION (RECOMPILE);
        `);

        return result.recordset;
    } catch (error) {
        console.error("FEHLER IN getSectorsForList:", error);
        throw error;
    }
}

// ... deine bestehende getSectorsForList Funktion ...

async function getSectorMomentum(daysBack = 5) {
    try {
        const pool = await tradingConnect;
        const request = pool.request();
        request.input("daysBack", sql.Int, daysBack);

        // Wir holen die Historie (z.B. die letzten 15 Handelstage pro Sektor)
        const result = await request.query(`
            WITH RankedScores AS (
                SELECT 
                    name,
                    score,
                    anl_datum,
                    ROW_NUMBER() OVER (PARTITION BY name ORDER BY anl_datum DESC) as rn
                FROM marketScores WITH (NOLOCK)
                WHERE type = 'sector'
            )
            SELECT 
                name AS sector,
                score,
                anl_datum,
                rn
            FROM RankedScores
            WHERE rn <= @daysBack + 10
            ORDER BY name, anl_datum ASC;
        `);

        const rows = result.recordset;
        const sectorMap = {};

        // Nach Sektoren gruppieren (chronologisch von alt nach neu)
        rows.forEach(row => {
            if (!sectorMap[row.sector]) {
                sectorMap[row.sector] = [];
            }
            sectorMap[row.sector].push({
                score: row.score,
                date: row.anl_datum
            });
        });

        const formattedData = [];

        for (const [sector, scores] of Object.entries(sectorMap)) {
            // Wir brauchen mindestens so viele Einträge wie daysBack + 1, um ein Momentum zu bilden
            if (scores.length <= daysBack) continue;

            const history = [];
            
            // Berechne für jeden Punkt ab dem Index [daysBack] das Momentum im Vergleich zu 'daysBack' Tagen zuvor
            for (let i = daysBack; i < scores.length; i++) {
                const currentObj = scores[i];
                const pastObj = scores[i - daysBack];
                
                const score = currentObj.score;
                const momentum = score - pastObj.score;
                
                history.push({
                    x: score,
                    y: momentum,
                    date: currentObj.date
                });
            }

if (history.length > 0) {
                // Begrenzt den Schweif auf die letzten 5 Punkte für mehr Übersichtlichkeit
                const limitedHistory = history.slice(-5);
                const latest = limitedHistory[limitedHistory.length - 1];
                
                formattedData.push({
                    sector: sector,
                    score: latest.x,
                    momentum: latest.y,
                    history: limitedHistory
                });
            }
        }

        return formattedData;
    } catch (error) {
        console.error("FEHLER IN getSectorMomentum:", error);
        throw error;
    }
}

module.exports = {
    getSectorsForList,
    getSectorMomentum
};