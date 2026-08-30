const { loadStockRawData } = require("./analysis/loadStockRawData");

(async () => {
    console.log("TEST START");

    const t0 = Date.now();
    const raw = await loadStockRawData();
    const t1 = Date.now();

    console.log("TEST DONE");
    console.log("Dauer RAW:", (t1 - t0), "ms");
    console.log("Anzahl Stocks:", Object.keys(raw.stocks).length);
    console.log("Dates:", raw.dates);
})();
