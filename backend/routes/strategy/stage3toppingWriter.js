const express = require("express");
const router = express.Router();

const { yahooPool, tradingPool } = require("../../db/connection");

// Hilfsfunktion für das lineare Scoring des 52W-High-Abstands
function calculateHighDistScore(dist) {
    if (dist >= -10) return 12;
    let excessDrop = Math.abs(dist) - 10;
    let penalty = Math.floor(excessDrop / 5);
    return Math.max(0, 12 - penalty);
}

// ------------------------------------------------------
// Stage3 Topping Writer – neue Struktur
// ------------------------------------------------------
router.get("/write-stage3-topping", async (req, res) => {
    const t0 = performance.now(); // Startpunkt der Messung
    try {
        console.log("Stage3-Topping Writer gestartet");

        // ------------------------------------------------------
        // 0) Gedächtnis laden (strategies → yahoo)
        // ------------------------------------------------------
        const memoryResult = await yahooPool.request().query(`
            SELECT ticker, s1_state_active, s1_trigger_date, s1_days_above
            FROM yahoo.dbo.strategies
            WHERE strategy_name = 'S1_STAGE3_TOPPING'
              AND [date] = (
                  SELECT MAX([date]) 
                  FROM yahoo.dbo.strategies 
                  WHERE strategy_name = 'S1_STAGE3_TOPPING'
              )
        `);

        const lastToppingMap = {};
        memoryResult.recordset.forEach(s => {
            lastToppingMap[s.ticker] = {
                signal_state_active: s.s1_state_active ?? 0,
                trigger_date:        s.s1_trigger_date ?? null,
                days_above_sma:      s.s1_days_above   ?? 0
            };
        });

        // ------------------------------------------------------
        // 1) Industry‑Ranking aus marketScores
        // ------------------------------------------------------
        const industryResult = await tradingPool.request().query(`
            SELECT name, rank_db
            FROM trading.dbo.marketScores
            WHERE type = 'industry'
              AND anl_datum = (
                  SELECT MAX(anl_datum)
                  FROM trading.dbo.marketScores
                  WHERE type = 'industry'
              )
        `);

        const industryMap = new Map(
            industryResult.recordset.map(r => [r.name, r.rank_db])
        );

        // ------------------------------------------------------
        // 2) Finviz-Daten laden (inkl. _52w_high)
        // ------------------------------------------------------
        const result = await tradingPool.request().query(`
            SELECT 
                ticker,
                price,
                sma200,
                industry,
                _52w_high,
                anl_datum
            FROM trading.dbo.finviz
        `);

        const allRows = result.recordset;

        const grouped = {};
        allRows.forEach(row => {
            if (!grouped[row.ticker]) grouped[row.ticker] = [];
            row.anl_datum = new Date(row.anl_datum);
            grouped[row.ticker].push(row);
        });

        // ------------------------------------------------------
        // 3) Stage3-Berechnung
        // ------------------------------------------------------
        const processedRaw = Object.values(grouped).map(history => {

            if (history.length < 21) return null;

            const latest         = history.at(-1);
            const history20      = history.slice(-20);

            const prev = lastToppingMap[latest.ticker] ?? {
                signal_state_active: 0,
                trigger_date: null,
                days_above_sma: 0
            };

            const currentSmaPrice = latest.price / (1 + (latest.sma200 / 100));

            const hasBeenAboveAfterBelow = history20.some((r, idx) => {
                const smaVal = r.price / (1 + (r.sma200 / 100));
                if (r.price > smaVal) {
                    return history20.slice(0, idx).some(oldR =>
                        oldR.price < (oldR.price / (oldR.sma200 / 100))
                    );
                }
                return false;
            });

            let currentDaysAbove = (latest.price > currentSmaPrice)
                ? (prev.days_above_sma + 1)
                : 0;

            let state_active = prev.signal_state_active;
            let trigger_date = prev.trigger_date;

            if (currentDaysAbove >= 2) {
                state_active = 0;
                trigger_date = null;
            }

            if (state_active === 0 && latest.price < currentSmaPrice && hasBeenAboveAfterBelow) {
                state_active = 1;
                trigger_date = latest.anl_datum;
            }

            // --- S1 (State Active) ---
            const s1 = state_active ? 40 : 0;

            // --- S2 (Age) ---
            let s2 = 0;
            if (state_active && trigger_date) {
                const diffDays = Math.floor(
                    (latest.anl_datum - new Date(trigger_date)) / 86400000
                );
                s2 = Math.max(0, 20 - (diffDays * 2));
            }

            // --- S3 (Slope) ---
            const daysBack = Math.min(10, history.length - 1);
            const pastRow = history[history.length - 1 - daysBack];
            const pastSmaPrice = pastRow.price / (1 + (pastRow.sma200 / 100));
            const smaSlopePercent = ((currentSmaPrice - pastSmaPrice) / pastSmaPrice) * 100;
            
            const s3 = Math.max(0, 30 * (1 - Math.pow(smaSlopePercent / 5, 2)));

            // --- S4 (Industry Rank) ---
            const indRank = industryMap.get(latest.industry) ?? 999;
            const s4 = indRank <= 15 ? 0 : Math.min(25, (indRank / 200) * 25);

            // --- S5 (SMA Distance) ---
            const smaDist = latest.sma200 ?? 0;
            const s5 = Math.max(0, 10 - Math.abs(smaDist));

            // --- Neuer Faktor: 52W High Distance & Lineares Scoring ---
            const highDistVal = latest._52w_high ?? 0;
            const s6 = calculateHighDistScore(highDistVal);

            // Hinweis: Falls totalScore auf allen 6 Faktoren basiert, hier entsprechend anpassen
            const totalScore = parseFloat((s1 + s2 + s3 + s4 + s5 + s6).toFixed(2));

            return {
                ticker: latest.ticker,
                latest,
                anl_datum: latest.anl_datum,
                state_active,
                trigger_date,
                currentDaysAbove,
                indRank,
                price: latest.price,
                totalScore,
                smaSlopePercent,
                smaDist,
                highDistVal,
                detailsJson: JSON.stringify({
                    score_stateActive: s1,
                    score_age: s2,
                    score_slope: s3,
                    score_indRank: s4,
                    score_smaDist: s5,
                    score_highDist: s6
                })
            };
        });

        // ------------------------------------------------------
        // 4) Finaler Filter
        // ------------------------------------------------------
        const processedData = processedRaw
            .filter(item =>
                item !== null &&
                item.state_active > 0 &&
                item.price > 12 &&
                item.indRank > 15
            )
            .sort((a, b) => b.totalScore - a.totalScore);

        // ------------------------------------------------------
        // 5) Export nach yahoo.dbo.strategies
        // ------------------------------------------------------
        if (processedData.length > 0) {

            const request = yahooPool.request();
            const todayStr = processedData[0].anl_datum.toISOString().split('T')[0];

            await request.query(`
                DELETE FROM yahoo.dbo.strategies
                WHERE [date] = '${todayStr}'
                  AND [strategy_name] = 'S1_STAGE3_TOPPING'
            `);

            for (const item of processedData) {

                const triggerDateStr = item.trigger_date
                    ? `'${new Date(item.trigger_date).toISOString().split('T')[0]}'`
                    : 'NULL';

                await request.query(`
                    INSERT INTO yahoo.dbo.strategies
                    (
                        [date], [ticker], [strategy_name],
                        [s1_total_score], [s1_state_active], [s1_trigger_date],
                        [s1_days_above], [s1_slope_val], [s1_ind_rank],
                        [s1_sma_dist], [s1_high_dist], [s1_details_json]
                    )
                    VALUES (
                        '${item.anl_datum.toISOString().split('T')[0]}',
                        '${item.ticker}',
                        'S1_STAGE3_TOPPING',
                            ${item.totalScore},
                            ${item.state_active},
                            ${triggerDateStr},
                            ${item.currentDaysAbove},
                            ${item.smaSlopePercent},
                            ${item.indRank},
                            ${item.smaDist},
                            ${item.highDistVal},
                        '${item.detailsJson}'
                    )
                `);
            }

            console.log(`Stage3-Topping gespeichert: ${processedData.length} Signale`);
        } else {
            console.log("Stage3-Topping: keine aktiven Signale");
        }

            const t1 = performance.now(); // Endpunkt der Messung

                res.json({
                    success: true,
                    duration: ((t1 - t0) / 1000).toFixed(1) + "s",
                    count: processedData.length
                });

    } catch (err) {
        console.error("Stage3-Topping Writer Fehler:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;