const express = require('express');
const router = express.Router();

const { writeStocksJson } = require('../../analysis/rs/writeStocksJson');
const { updateTileStatus } = require('../../utils/cockpitStatus');

router.get('/write-stocks', async (req, res) => {
  const start = Date.now();

  try {
    const snapshot = await writeStocksJson();

    const durationMs = Date.now() - start;
    const duration = `${(durationMs / 1000).toFixed(2)}s`;

    // ⭐ KORREKT: Update geht an die Kategorie 'calculations'
    updateTileStatus("calculations", {
        RS_Stocks: {
            status: "success",
            lastRun: new Date().toISOString(),
            duration: duration,
            error: null // WICHTIG: Fehler vom letzten Mal explizit löschen!
        }
    });

    res.json({ success: true, count: Object.keys(snapshot).length });

  } catch (err) {
    console.error("❌ Fehler beim Schreiben der RS Stocks:", err);

    // ⭐ KORREKT: Auch der Fehler-Block MUSS die Kategorie 'calculations' nutzen
    updateTileStatus("calculations", {
        RS_Stocks: {
            status: "error",
            lastRun: new Date().toISOString(),
            duration: null,
            error: err.message
        }
    });

    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
