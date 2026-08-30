const express = require('express');
const router = express.Router();

const { writeSectorsJson } = require('../../analysis/rs/writeSectorsJson');
const { updateTileStatus } = require('../../utils/cockpitStatus');

router.get('/write-sectors', async (req, res) => {
  const start = Date.now();

  try {
    const snapshot = await writeSectorsJson();

    const durationMs = Date.now() - start;
    const duration = `${(durationMs / 1000).toFixed(2)}s`;

    updateTileStatus("RS_Sectors", {
      status: "success",
      lastRun: new Date().toISOString(),
      duration
    });

    res.json({
      success: true,
      count: snapshot.length,
      message: "RS Sectors JSON erfolgreich erzeugt."
    });

  } catch (err) {
    console.error("❌ Fehler beim Schreiben der RS Sektoren:", err);

    updateTileStatus("RS_Sectors", {
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
