const { tradingConnect } = require("../db/connection");
const sql = require("mssql");

/* ---------------------------------------------------------
   SECTOR LIST (unverändert)
--------------------------------------------------------- */
async function getSectorsForList() {
    try {
        const pool = await tradingConnect;

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

/* ---------------------------------------------------------
   SECTOR MOMENTUM (Delta + ROC)
--------------------------------------------------------- */
async function getSectorMomentum(daysBack = 5) {
    try {
        const pool = await tradingConnect;
        const request = pool.request();
        request.input("daysBack", sql.Int, daysBack);

        // Score-Historie holen
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

        // Gruppieren nach Sektor
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
            if (scores.length <= daysBack) continue;

            const history = [];

            // Delta + ROC berechnen
            for (let i = daysBack; i < scores.length; i++) {
                const currentObj = scores[i];
                const pastObj = scores[i - daysBack];

                const scoreNow = currentObj.score;
                const scorePast = pastObj.score;

                const delta = scoreNow - scorePast;
                const roc = scorePast !== 0 ? (scoreNow / scorePast) - 1 : 0;

                history.push({
                    score: scoreNow,
                    delta,
                    roc,
                    date: currentObj.date
                });
            }

            if (history.length > 0) {
                const limitedHistory = history.slice(-5);
                const latest = limitedHistory.at(-1);

                formattedData.push({
                    sector,
                    latest: {
                        score: latest.score,
                        delta: latest.delta,
                        roc: latest.roc
                    },
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
