const express = require("express");
const router = express.Router();

const { loadStockRawData } = require("../../analysis/loadStockRawData");
const { getStockSignals } = require("../../analysis/sparksignals/stockSignals");

router.get("/", async (req, res) => {
    console.log("STEP 1: Route entered");

    let t0 = Date.now();
    const raw = await loadStockRawData();
    let t1 = Date.now();

    console.log("STEP 2: RAW loaded in", (t1 - t0), "ms");
    console.log("STEP 2: Stocks =", Object.keys(raw.stocks).length);

    let t2 = Date.now();
    const signals = getStockSignals(raw);
    let t3 = Date.now();

    console.log("STEP 3: SIGNALS generated in", (t3 - t2), "ms");

    res.json({
        success: true,
        rawTime: t1 - t0,
        signalTime: t3 - t2,
        stocks: Object.keys(signals).length
    });
});


module.exports = router;
