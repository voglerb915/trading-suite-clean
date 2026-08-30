const { sql, tradingPool } = require('../db/connection.js');
const { getSectorForIndustry } = require("../utils/industrySectorMap.js");

async function loadExcelRawData() {
    // 1) Letzte 25 Tage holen
    const datesResult = await tradingPool.request().query(`
        SELECT DISTINCT TOP 25
            CONVERT(VARCHAR(10), anl_datum, 23) AS anl_datum
        FROM trading.dbo.finviz_groups
        ORDER BY anl_datum DESC
    `);

    const dates = datesResult.recordset.map(r => r.anl_datum);

    // 2) Daten für diese Tage holen
    const dataResult = await tradingPool.request().query(`
        SELECT
            [group],
            name,
            perf_week,
            perf_month,
            perf_quart,
            CONVERT(VARCHAR(10), anl_datum, 23) AS anl_datum
        FROM trading.dbo.finviz_groups
        WHERE CONVERT(VARCHAR(10), anl_datum, 23) IN (${dates.map(d => `'${d}'`).join(",")})
        ORDER BY anl_datum DESC, name ASC
    `);

    const rows = dataResult.recordset;

    // 3) Pivot-Struktur
    const sectors = {};
    const industries = {};

    const groups = { sector: sectors, industry: industries };

    const namesByGroup = {
        sector: [...new Set(rows.filter(r => r.group === "sector").map(r => r.name))],
        industry: [...new Set(rows.filter(r => r.group === "industry").map(r => r.name))]
    };

    ["sector", "industry"].forEach(g => {
        namesByGroup[g].forEach(name => {
            groups[g][name] = { week: [], month: [], quarter: [] };

            dates.forEach(date => {
                const row = rows.find(r => r.group === g && r.name === name && r.anl_datum === date);

                groups[g][name].week.push(row ? row.perf_week : null);
                groups[g][name].month.push(row ? row.perf_month : null);
                groups[g][name].quarter.push(row ? row.perf_quart : null);
            });
        });
    });

    Object.keys(industries).forEach(ind => {
        industries[ind].sector = getSectorForIndustry(ind);
    });

    return { success: true, dates, sectors, industries };
}

module.exports = { loadExcelRawData };
