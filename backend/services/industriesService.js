const { tradingConnect } = require("../db/connection");
const sql = require("mssql");

async function getIndustriesForList() {
    try {
        const pool = await tradingConnect;

        // 1. Das neueste ANALYSE-Datum für Industrien holen
        const dateResult = await pool.request().query(`
            SELECT CONVERT(VARCHAR(10), MAX(anl_datum), 120) AS max_date
            FROM marketScores WITH (NOLOCK)
            WHERE type = 'industry'
            OPTION (RECOMPILE);
        `);
        
        const latestDate = dateResult.recordset[0]?.max_date;
        if (!latestDate) return [];

        const request = pool.request();
        request.input("targetDate", sql.VarChar(10), latestDate);

        // 2. Die Hauptabfrage mit dem sauberen finviz-Mapping
        const result = await request.query(`
            DECLARE @start DATETIME = CAST(@targetDate AS DATETIME);
            DECLARE @end DATETIME = DATEADD(day, 1, @start);

            WITH IndustrySectorCTE AS (
                SELECT DISTINCT f.industry, f.sector
                FROM finviz f WITH (NOLOCK)
                WHERE f.anl_datum >= @start AND f.anl_datum < @end
                  AND f.industry IS NOT NULL
            )
            SELECT
                ms.name AS industry,
                ms.score AS rsScore,
                ms.rank_db AS rsRank,
                ms.diffD,
                ms.diffW,
                ms.diffM,
                ISNULL(isc.sector, 'Unknown') AS sector
            FROM marketScores ms WITH (NOLOCK)
            LEFT JOIN IndustrySectorCTE isc 
                ON isc.industry = ms.name
            WHERE ms.type = 'industry'
              AND ms.anl_datum >= @start AND ms.anl_datum < @end
            ORDER BY ms.rank_db ASC
            OPTION (RECOMPILE);
        `);

        return result.recordset;
    } catch (error) {
        console.error("FEHLER IN getIndustriesForList:", error);
        throw error;
    }
}

async function getIndustryMomentum(daysBack = 5) {
    try {
        const pool = await tradingConnect;
        const request = pool.request();
        request.input("daysBack", sql.Int, daysBack);

        // 1. Neuestes Datum ermitteln, um das aktuelle Mapping (Industry -> Sector) stabil zu halten
        const dateResult = await pool.request().query(`
            SELECT CONVERT(VARCHAR(10), MAX(anl_datum), 120) AS max_date
            FROM marketScores WITH (NOLOCK)
            WHERE type = 'industry'
            OPTION (RECOMPILE);
        `);
        
        const latestDate = dateResult.recordset[0]?.max_date;
        if (!latestDate) return [];
        request.input("targetDate", sql.VarChar(10), latestDate);

        // 2. Historie der Industrien holen + Sektor-Mapping über CTE einbinden
        const result = await request.query(`
            DECLARE @start DATETIME = CAST(@targetDate AS DATETIME);
            DECLARE @end DATETIME = DATEADD(day, 1, @start);

            WITH IndustrySectorCTE AS (
                SELECT DISTINCT f.industry, f.sector
                FROM finviz f WITH (NOLOCK)
                WHERE f.anl_datum >= @start AND f.anl_datum < @end
                  AND f.industry IS NOT NULL
            ),
            RankedScores AS (
                SELECT 
                    ms.name,
                    ms.score,
                    ms.anl_datum,
                    ISNULL(isc.sector, 'Unknown') AS sector,
                    ROW_NUMBER() OVER (PARTITION BY ms.name ORDER BY ms.anl_datum DESC) as rn
                FROM marketScores ms WITH (NOLOCK)
                LEFT JOIN IndustrySectorCTE isc ON isc.industry = ms.name
                WHERE ms.type = 'industry'
            )
            SELECT 
                name AS industry,
                sector,
                score,
                anl_datum,
                rn
            FROM RankedScores
            WHERE rn <= @daysBack + 10
            ORDER BY name, anl_datum ASC;
        `);

        const rows = result.recordset;
        const industryMap = {};

        // Nach Industrien gruppieren (chronologisch von alt nach neu)
        rows.forEach(row => {
            if (!industryMap[row.industry]) {
                industryMap[row.industry] = {
                    sector: row.sector,
                    scores: []
                };
            }
            industryMap[row.industry].scores.push({
                score: row.score,
                date: row.anl_datum
            });
        });

        const formattedData = [];

        for (const [industry, data] of Object.entries(industryMap)) {
            const scores = data.scores;
            if (scores.length <= daysBack) continue;

            const history = [];
            
            // Berechne für jeden Punkt das Momentum im Vergleich zu 'daysBack' Tagen zuvor
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
                // Begrenzt den Schweif auf die letzten 5 Punkte
                const limitedHistory = history.slice(-5);
                const latest = limitedHistory[limitedHistory.length - 1];
                
                formattedData.push({
                    industry: industry,
                    sector: data.sector, // Wichtig: Übergabe des Sektors für die Frontend-Farbzuteilung!
                    score: latest.x,
                    momentum: latest.y,
                    history: limitedHistory
                });
            }
        }

        return formattedData;
    } catch (error) {
        console.error("FEHLER IN getIndustryMomentum:", error);
        throw error;
    }
}

module.exports = {
    getIndustriesForList,
    getIndustryMomentum
};