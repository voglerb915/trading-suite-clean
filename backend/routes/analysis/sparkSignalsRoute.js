const express = require("express");
const router = express.Router();

const { runAllSignals } = require("../../analysis/signalOrchestrator");
const { loadExcelRawData } = require("../../services/loadExcelRawData");

router.get("/", async (req, res) => {
    try {
        // 1) Excel-Rohdaten laden
        const rawExcelDatas = await loadExcelRawData();

        // 2) Sparkline-Signale erzeugen (WICHTIG: await!)
        const signals = await runAllSignals(rawExcelDatas);

        // 3) Antwort an Frontend
        res.json({
            success: true,
            ...signals
        });

    } catch (err) {
        console.error("❌ SparkSignals Fehler:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});


module.exports = router;
