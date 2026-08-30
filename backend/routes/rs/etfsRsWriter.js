const express = require('express');
const router = express.Router();

// 🟢 Jetzt importieren wir die soeben erstellte writeEtfsJson!
const { writeEtfsJson } = require('../../analysis/rs/writeEtfsJson'); 
const { updateTileStatus } = require('../../utils/cockpitStatus');

router.get('/write-etfs', async (req, res) => {
  const start = Date.now();

  try {
    // ⭐ Komplette Pipeline + File-System + DB-Insert ausführen
    const snapshot = await writeEtfsJson();

    const durationMs = Date.now() - start;
    const duration = `${(durationMs / 1000).toFixed(2)}s`;

    // ⭐ Cockpit-Status für das UI setzen
    updateTileStatus("RS_ETFs", {
      status: "success",
      lastRun: new Date().toISOString(),
      duration
    });

    res.json({
      success: true,
      count: snapshot ? snapshot.length : 0,
      message: "RS ETFs Pipeline & DB-Update erfolgreich ausgeführt."
    });

  } catch (err) {
    console.error("❌ Fehler beim Schreiben der RS ETFs:", err);

    updateTileStatus("RS_ETFs", {
      status: "error",
      lastRun: new Date().toISOString(),
      duration: null,
      error: err.message
    });

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;