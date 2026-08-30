const { tradingConnect } = require("../db/connection");
const sql = require("mssql");

// 🟦 Index-Normalisierung
const INDEX_MAP = {
    "s&p 500": "SP500",
    "ndx": "NDX",
    "djia": "DJI",
    "rut": "RUT"
};

function parseIndexField(rawIndex) {
    if (!rawIndex || rawIndex.trim() === "" || rawIndex.trim() === "-") {
        return [];
    }

    return rawIndex
        .split(",")
        .map(x => x.trim().toLowerCase())
        .map(x => INDEX_MAP[x] ?? null)
        .filter(x => x !== null);
}

async function getStocksForList() {
    try {
        const pool = await tradingConnect;

        const dateResult = await pool.request().query(`
            SELECT MAX(anl_datum) AS max_date 
            FROM marketScores WITH (NOLOCK)
            WHERE type = 'stock';
        `);
        
        const latestDate = dateResult.recordset[0]?.max_date;
        if (!latestDate) return [];

        const request = pool.request();
        request.input("targetDate", sql.DateTime, latestDate);

        const result = await request.query(`
            SELECT
                ms.name        AS ticker,
                f.company,
                f.sector,
                f.industry,
                f.price,
                f.change,
                f.volume,
                ms.score       AS rsScore,
                ms.rank_db     AS rsRank,
                f.anl_datum    AS anl_datum,
                f.[_52w_high]  AS [52w_high],
                f.[index]      AS finviz_index
            FROM marketScores ms WITH (NOLOCK)
            INNER JOIN finviz f WITH (NOLOCK) 
                ON f.anl_datum = @targetDate  
               AND f.ticker = ms.name
            WHERE ms.type = 'stock'
              AND ms.anl_datum = @targetDate
            ORDER BY ms.rank_db ASC;
        `);

        return result.recordset.map(row => ({
            ...row,
            index: parseIndexField(row.finviz_index)
        }));

    } catch (error) {
        console.error("FEHLER IN getStocksForList:", error);
        throw error;
    }
}

// 🟢 VEREINTE FUNKTION: Momentum, RRG-Historie & Anti-Spike-Filter
async function getStockMomentum(daysBack = 5, targetUniverse = 'all') {
    try {
        const pool = await tradingConnect;

        // 1. Die benötigten Handelstage ermitteln (für die Historie / RRG-Schweife)
        const datesResult = await pool.request().query(`
            SELECT DISTINCT TOP (${daysBack + 10}) anl_datum 
            FROM marketScores WITH (NOLOCK) 
            WHERE type = 'stock' 
            ORDER BY anl_datum DESC;
        `);

        const dates = datesResult.recordset.map(r => r.anl_datum);
        if (dates.length < 2) return {};

        const latestDate = dates[0];

        // 2. Historische Scores + aktuelle Finviz-Metadaten in einem Abwasch holen
        const request = pool.request();
        request.input("latestDate", sql.DateTime, latestDate);

        const result = await request.query(`
            WITH RankedScores AS (
                SELECT 
                    name AS ticker,
                    score,
                    anl_datum,
                    ROW_NUMBER() OVER (PARTITION BY name ORDER BY anl_datum DESC) as rn
                FROM marketScores WITH (NOLOCK)
                WHERE type = 'stock'
            )
            SELECT 
                rs.ticker,
                rs.score,
                rs.anl_datum,
                rs.rn,
                f.company,
                f.sector,
                f.industry,
                f.price,
                f.change,
                f.volume,
                f.[_52w_high] AS [52w_high],
                f.[index]     AS finviz_index
            FROM RankedScores rs
            INNER JOIN finviz f WITH (NOLOCK) 
                ON f.ticker = rs.ticker 
               AND f.anl_datum = @latestDate
            WHERE rs.rn <= ${daysBack + 10}
            ORDER BY rs.ticker, rs.anl_datum ASC;
        `);

        const rows = result.recordset;
        const stockMap = {};

        // Nach Ticker gruppieren für die Historien-Berechnung (RRG-Schweife)
        rows.forEach(row => {
            if (!stockMap[row.ticker]) {
                stockMap[row.ticker] = {
                    ticker: row.ticker,
                    company: row.company,
                    sector: row.sector,
                    industry: row.industry,
                    price: row.price,
                    change: row.change,
                    volume: row.volume,
                    index: parseIndexField(row.finviz_index),
                    scores: []
                };
            }
            stockMap[row.ticker].scores.push({
                score: row.score,
                date: row.anl_datum
            });
        });

        let formattedStocks = [];

        for (const [ticker, data] of Object.entries(stockMap)) {
            const scores = data.scores;
            if (scores.length <= daysBack) continue;

            const history = [];
            
            // RRG-Historie aufbauen (aktueller Score minus Score vor 'daysBack' Tagen)
            for (let i = daysBack; i < scores.length; i++) {
                const currentObj = scores[i];
                const pastObj = scores[i - daysBack];
                
                history.push({
                    x: currentObj.score,
                    y: currentObj.score - pastObj.score,
                    date: currentObj.date
                });
            }

            if (history.length > 0) {
                const limitedHistory = history.slice(-5); // Schweif auf max 5 Punkte begrenzen
                const latest = limitedHistory[limitedHistory.length - 1];
                
                formattedStocks.push({
                    ticker: data.ticker,
                    company: data.company,
                    sector: data.sector,
                    industry: data.industry,
                    price: data.price,
                    change: data.change,
                    volume: data.volume,
                    index: data.index,
                    rsScore: latest.x,
                    momentum: latest.y,
                    history: limitedHistory
                });
            }
        }

        // 🛡️ 3. Qualitäts- und Anti-Spike-Filter anwenden
        formattedStocks = formattedStocks.filter(r => {
            const isRussell = r.index.includes("RUT");
            const price = r.price || 0;
            const volume = r.volume || 0;
            const dollarVolume = price * volume;

            if (price < 5.0) return false;

            if (isRussell) {
                if (price < 10.0 && dollarVolume < 1500000) return false; 
                if (volume < 100000) return false;
            }

            return true;
        });

        // 4. Hilfsfunktion zur Quoten-Bildung pro Index
        const getListForIndex = (stockList, indexKey, topLimit, loserLimit) => {
            const filtered = indexKey === 'NONE' 
                ? stockList.filter(s => s.index.length === 0)
                : stockList.filter(s => s.index.includes(indexKey));

            const sorted = [...filtered].sort((a, b) => b.momentum - a.momentum);

            return {
                top: sorted.slice(0, topLimit),
                losers: sorted.slice(-loserLimit).reverse()
            };
        };

        const responseData = {
            SP500: getListForIndex(formattedStocks, 'SP500', 10, 10),
            NDX:   getListForIndex(formattedStocks, 'NDX', 5, 5),
            DJI:   getListForIndex(formattedStocks, 'DJI', 2, 2),
            RUT:   getListForIndex(formattedStocks, 'RUT', 10, 10),
            NONE:  getListForIndex(formattedStocks, 'NONE', 10, 10)
        };

        if (targetUniverse !== 'all' && responseData[targetUniverse.toUpperCase()]) {
            return responseData[targetUniverse.toUpperCase()];
        }

        return responseData;

    } catch (error) {
        console.error("FEHLER IN getStockMomentum:", error);
        throw error;
    }
}

module.exports = {
    getStocksForList,
    getStockMomentum
};