const express = require("express");
const router = express.Router();

const { yahooPool } = require("../../db/connection");

// ------------------------------------------------------
// Stage3 Topping Reader – liefert RAW + SCORE wie Writer
// ------------------------------------------------------
router.get("/stage3topping", async (req, res) => {
    try {
        console.log("Stage3-Topping Reader gestartet");

        const lastDateResult = await yahooPool.request().query(`
            SELECT MAX([date]) AS lastDate
            FROM yahoo.dbo.strategies
            WHERE strategy_name = 'S1_STAGE3_TOPPING'
        `);

        const lastDateRaw = lastDateResult.recordset[0].lastDate;
        if (!lastDateRaw) {
            return res.json({ success: true, lastDate: null, signals: [] });
        }

        const lastDate = new Date(lastDateRaw);
        const lastDateStr = lastDate.toISOString().split("T")[0];

        const signalsResult = await yahooPool.request().query(`
            SELECT 
                ticker,
                s1_total_score,
                s1_state_active,
                s1_trigger_date,
                s1_days_above,
                s1_slope_val,
                s1_ind_rank,
                s1_sma_dist
            FROM yahoo.dbo.strategies
            WHERE [date] = '${lastDateStr}'
              AND strategy_name = 'S1_STAGE3_TOPPING'
            ORDER BY s1_total_score DESC
        `);

        const mapped = signalsResult.recordset.map(r => {

            const stateActive = r.s1_state_active;
            const triggerDate = r.s1_trigger_date;
            const daysAbove   = r.s1_days_above;
            const slopeVal    = r.s1_slope_val;   // Writer: latest.sma200
            const indRank     = r.s1_ind_rank;
            const smaDist     = r.s1_sma_dist;    // Writer: 0

            // S1
            const s1 = stateActive ? 40 : 0;

            // S2
            let s2 = 0;
            if (stateActive && triggerDate) {
                const diffDays = daysAbove ?? 0;
                s2 = Math.max(0, 20 - (diffDays * 2));
            }

            // S3
            const smaSlopePercent = slopeVal ?? 0;
            const s3 = Math.max(0, 30 * (1 - Math.pow(smaSlopePercent / 5, 2)));

            // S4
            const s4 = indRank <= 15 ? 0 : Math.min(25, (indRank / 200) * 25);

            // S5
            const s5 = Math.max(0, 10 - Math.abs(smaDist ?? 0));

            const totalScore = parseFloat((s1 + s2 + s3 + s4 + s5).toFixed(2));

            return {
                ticker: r.ticker,

                // RAW
                stateActive,
                triggerDate,
                daysAbove,
                slopeVal,
                indRank,
                smaDist,
                totalScore,

                // SCORE
                score_stateActive: s1,
                score_age:         s2,
                score_slope:       s3,
                score_indRank:     s4,
                score_smaDist:     s5,

                // StrategyValue
                strategyValue: totalScore
            };
        });

        res.json({
            success: true,
            lastDate,
            signals: mapped
        });

    } catch (err) {
        console.error("Stage3-Topping Reader Fehler:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
