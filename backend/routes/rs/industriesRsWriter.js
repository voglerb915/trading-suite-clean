const express = require('express');
const router = express.Router();

const { writeIndustriesJson } = require('../../analysis/rs/writeIndustriesJson');
const { updateTileStatus } = require('../../utils/cockpitStatus');

router.get('/write-industries', async (req, res) => {
  const start = Date.now();

  try {
    const snapshot = await writeIndustriesJson();

    const durationMs = Date.now() - start;
    const duration = `${(durationMs / 1000).toFixed(2)}s`;

    updateTileStatus("RS_Industries", {
      status: "success",
      lastRun: new Date().toISOString(),
      duration
    });

    res.json({
      success: true,
      count: snapshot.length,
      message: "RS Industries JSON erfolgreich erzeugt."
    });

  } catch (err) {
    console.error("❌ Fehler beim Schreiben der RS Industries:", err);

    updateTileStatus("RS_Industries", {
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
