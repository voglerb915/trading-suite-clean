const express = require("express");
const router = express.Router();

const { getStocksForList } = require("../../services/stocksService");
const { getSectorsForList } = require("../../services/sectorsService");
const { getIndustriesForList } = require("../../services/industriesService");
const { getEtfsForList } = require("../../services/etfsService");

router.get("/", async (req, res) => {
    try {
        // OPTIMIERUNG: Sequentielles Laden statt Promise.all
        // Nimmt den extremen parallelen Druck von der SQLEXPRESS-Datenbank
        const stocks = await getStocksForList();
        const sectors = await getSectorsForList();
        const industries = await getIndustriesForList();
        const etfs = await getEtfsForList();

        res.json({ stocks, sectors, industries, etfs });

    } catch (err) {
        console.error("Dashboard Load Error:", err);
        res.status(500).json({ error: "Dashboard konnte nicht geladen werden" });
    }
});

module.exports = router;

/*parallele abfragen - oben neu sequenziell*/

/* const express = require("express");
const router = express.Router();

const { getStocksForList } = require("../../services/stocksService");
const { getSectorsForList } = require("../../services/sectorsService");
const { getIndustriesForList } = require("../../services/industriesService");
const { getEtfsForList } = require("../../services/etfsService");

router.get("/", async (req, res) => {
    try {
        const [stocks, sectors, industries, etfs] = await Promise.all([
            getStocksForList(),
            getSectorsForList(),
            getIndustriesForList(),
            getEtfsForList()
        ]);

        res.json({ stocks, sectors, industries, etfs });

    } catch (err) {
        console.error("Dashboard Load Error:", err);
        res.status(500).json({ error: "Dashboard konnte nicht geladen werden" });
    }
});

module.exports = router;
*/
