const { yahooPool } = require("../../db/connection");

async function getStage3Data() {
    console.log("Stage3-Topping Service gestartet");

    // 1) Das jüngste Datum ermitteln
    const lastDateResult = await yahooPool.request().query(`
        SELECT MAX([date]) AS lastDate
        FROM yahoo.dbo.strategies
        WHERE strategy_name = 'S1_STAGE3_TOPPING'
    `);

    const lastDateRaw = lastDateResult.recordset[0]?.lastDate;
    if (!lastDateRaw) {
        return [];
    }

    const lastDateStr = new Date(lastDateRaw).toISOString().split("T")[0];

    // 2) Fertige Datensätze direkt aus der Datenbank abfragen
    const signalsResult = await yahooPool.request().query(`
        SELECT 
            ticker,
            s1_total_score,
            s1_state_active,
            s1_trigger_date,
            s1_days_above,
            s1_slope_val,
            s1_ind_rank,
            s1_sma_dist,
            s1_high_dist,
            s1_details_json
        FROM yahoo.dbo.strategies
        WHERE [date] = '${lastDateStr}'
          AND strategy_name = 'S1_STAGE3_TOPPING'
        ORDER BY s1_total_score DESC
    `);

    // 3) Sauber mappen
    return signalsResult.recordset.map(r => {
        let details = {};
        try {
            details = r.s1_details_json ? JSON.parse(r.s1_details_json) : {};
        } catch (e) {
            details = {};
        }

        let signalAgeDays = 0;
        if (r.s1_trigger_date) {
            const triggerTime = new Date(r.s1_trigger_date).getTime();
            const nowTime = new Date(lastDateRaw).getTime();
            signalAgeDays = Math.max(0, Math.floor((nowTime - triggerTime) / 86400000) + 1);
        }

        let fallbackHighDistScore = 12;
        const distVal = r.s1_high_dist ?? 0;
        if (distVal < -10) {
            let excessDrop = Math.abs(distVal) - 10;
            let penalty = Math.floor(excessDrop / 5);
            fallbackHighDistScore = Math.max(0, 12 - penalty);
        }

        return {
            ticker: r.ticker,
            totalScore: r.s1_total_score,
            stateActive: r.s1_state_active,
            triggerDate: r.s1_trigger_date,
            daysAbove: r.s1_days_above,
            slopeVal: r.s1_slope_val !== null ? parseFloat(r.s1_slope_val.toFixed(2)) : 0,
            indRank: r.s1_ind_rank,
            smaDist: r.s1_sma_dist,
            highDist: r.s1_high_dist,
            strategyValue: r.s1_total_score,
            score_stateActive: details.score_stateActive ?? (r.s1_state_active ? 40 : 0),
            score_age: details.score_age ?? 0,
            score_slope: details.score_slope ?? 0,
            score_indRank: details.score_indRank ?? 0,
            score_smaDist: details.score_smaDist ?? 0,
            score_highDist: details.score_highDist ?? fallbackHighDistScore,
            signalAgeDays: signalAgeDays,
            display_slope: r.s1_slope_val !== null ? r.s1_slope_val.toFixed(2) : "0.00",
            display_highDist: r.s1_high_dist !== null ? r.s1_high_dist.toFixed(2) : "0.00"
        };
    });
}

module.exports = { getStage3Data };