const { tradingConnect } = require("../db/connection");

let industrySectorMap = {};

async function loadIndustrySectorMap() {
    // ⭐ Pool korrekt awaiten
    const pool = await tradingConnect;

    const result = await pool.request().query(`
        SELECT DISTINCT industry, sector
        FROM trading.dbo.finviz
        WHERE industry IS NOT NULL AND sector IS NOT NULL
    `);

    industrySectorMap = {};

    result.recordset.forEach(r => {
        industrySectorMap[r.industry] = r.sector;
    });

    console.log(`[IndustrySectorMap] geladen: ${Object.keys(industrySectorMap).length} Industries`);
}

function getSectorForIndustry(industry) {
    return industrySectorMap[industry] || "Unknown";
}

module.exports = { loadIndustrySectorMap, getSectorForIndustry };
