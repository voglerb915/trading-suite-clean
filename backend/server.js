const express = require('express');
const compression = require('compression');
const path = require('path');
const cors = require('cors');
const os = require('os'); // <--- NEU: Für die Geräte-Erkennung
const logger = require('./utils/logger');
const { getTradingDate } = require('./utils/dateHelper');
const systemStatusRoutes = require('./routes/system/systemStatusRoutes.js')
const { loadIndustrySectorMap } = require('./utils/industrySectorMap');

// --- Datenbank-Verbindung importieren ---
const { tradingConnect, yahooConnect, journalConnect } = require('./db/connection');

const app = express();

// --- Middleware ---
app.use(compression());
app.use(cors());
app.use(express.json());

// --- Datenbank-Check beim Start ---
Promise.all([tradingConnect, yahooConnect, journalConnect])
    .then(() => {
        console.log('✅ Datenbanken erfolgreich verbunden (Pfad: ./db/connection.js)');
    })
    .catch(err => {
        console.error('❌ Datenbank-Verbindungsfehler:', err.message);
    });

// ---------------------------------------------
// 1. NEU: Geräte-Info Endpunkt
// ---------------------------------------------
app.get('/api/device-info', (req, res) => {
    const hostname = os.hostname();
    res.json({ 
        deviceName: hostname,
        // Erkennt deinen Laptop anhand des Namens aus dem SSMS-Screenshot
        isLaptop: hostname.toUpperCase().includes('TRADESMART') 
    });
});

// ANALYSIS
app.use("/api/sparksignals", require("./routes/analysis/sparkSignalsRoute")); //alte Struktur mit Komplettee Paketen
app.use("/api/sparklinesignals", require("./routes/analysis/sparkLineSignals")); //neue CockpitStruktur - nur flache json

//Charts
app.use("/api/charts", require("./routes/charts/chartsRoute"));

// MARKET
app.use("/api/market/stocks", require("./routes/market/stocks"));
app.use("/api/market/sectors", require("./routes/market/sectors"));
app.use("/api/market/industries", require("./routes/market/industries"));
app.use("/api/market/etfs", require("./routes/market/etfs"));
app.use("/api/market/dashboard", require("./routes/market/dashboard"));

// DATA
app.use("/api/data/volume-metrics", require("./routes/data/volumeMetrics"));
app.use("/api/data/daily-history", require("./routes/data/dailyHistory"));
app.use("/api/data/indexhistory", require("./routes/data/indexHistory"));
app.use("/api/data/downloads", require("./routes/data/download_stream_indexes"));
app.use("/api/data/downloads", require("./routes/data/download_stream_stocks"));
app.use("/api/data/downloads", require("./routes/data/loadYahooStocks"));
app.use("/api/data/excel", require("./routes/data/excelRawData"));
app.use('/api/data/metrics/run', require('./routes/data/readWriteMetrics'));

// STRATEGY
//app.use("/api/strategy", require("./routes/strategy/strategies")); für high52 + nearHigh52 die aber aktuell im frontend laufen
app.use("/api/strategy", require("./routes/strategy/stage3toppingWriter"));
app.use("/api/strategy", require("./routes/strategy/stage3toppingReader"));
app.use("/api/strategy", require("./routes/strategy/insideDay52wWriter"));
app.use("/api/strategy", require("./routes/strategy/insideDay52wReader"));
app.use("/api/strategy", require("./routes/strategy/falseBreakOut52week")); // <--- NEU: False Breakout 52W Route eingebunden

// SIGNALS ENGINE (NEU)
app.use("/api/signals", require("./routes/strategy/signalsRoute")); //midSignals
//app.use("/api/sparkstocksignals", require("./routes/strategy/sparkStockSignalsRoute")); // falls alte struktur crasht
app.use("/api/signals/spark-signal", require("./routes/strategy/sparkStockSignalsRoute")); // alte CockpitStruktur
app.use("/api/signals", require("./routes/strategy/sparkSignalsWriter")); // <--- HIER EINBINDEN
app.use("/api/analysis/midsignals", require("./routes/analysis/midSignalsRoute")); // <--- NEU HIER


// // RS
app.use("/api/rs", require("./routes/rs/sectorsRsWriter"));
app.use("/api/rs", require("./routes/rs/industriesRsWriter"));
app.use("/api/rs", require("./routes/rs/stocksRsWriter"));
app.use("/api/rs", require("./routes/rs/etfsRsWriter")); 

// SYSTEM
app.use("/api/system/checks", require("./routes/system/checks"));
app.use("/api/system/cockpit", require("./routes/system/cockpitStatusRoutes"));
app.use("/api/system", require("./routes/system/systemStatusRoutes"));
app.use("/api/system", require("./routes/system/checkSparkStatus")); // <--- HIER EINBINDEN
// EXPORT ROUTE
app.use("/api/export", require("./routes/export/exportRoute"));


// JOURNAL & TRADING (IBKR)
app.use("/api/watchlist", require("./routes/journal/watchlistRoute"));
app.use("/api/orders", require("./routes/journal/ordersRoute"));
app.use("/api/ibkr", require("./routes/journal/ibkrRoute")); 
app.use("/api/journal", require("./routes/journal/journalRoute")); // <--- Hier den journalReader (journalRoute.js) einbinden

// ---------------------------------------------
// 3. STATIC FRONTEND SERVING
// ---------------------------------------------
const FRONTEND_ROOT = path.join(__dirname, '../frontend');

app.use('/cockpit', express.static(path.join(FRONTEND_ROOT, 'apps/cockpit')));
app.use('/lab', express.static(path.join(FRONTEND_ROOT, 'apps/lab')));
app.use('/dashboard', express.static(path.join(FRONTEND_ROOT, 'apps/dashboard')));
app.use('/journal', express.static(path.join(FRONTEND_ROOT, 'apps/journal')));
app.use('/charting-tool', express.static(path.join(FRONTEND_ROOT, 'apps/charting-tool')));
app.use('/control-center', express.static(path.join(FRONTEND_ROOT, 'apps/control-center')));
app.use('/shared', express.static(path.join(FRONTEND_root = path.join(FRONTEND_ROOT, 'shared')))); // (falls relevant)

// ---------------------------------------------
// 4. Fallback & Error Handling
// ---------------------------------------------
app.get('/', (req, res) => {
    res.redirect('/cockpit');
});

app.use((err, req, res, next) => {
    logger.error('SERVER', `${req.method} ${req.url} → ${err.message}`);
    res.status(500).json({ error: 'Interner Serverfehler' });
});

// ---------------------------------------------
// 5. Start Server
// ---------------------------------------------
const PORT = 4000;
app.listen(PORT, "0.0.0.0", async () => {
    console.log(`🚀 Trading-Suite Backend läuft auf Port ${PORT}`);
    console.log(`📅 Trading-Date: ${getTradingDate()}`);
    console.log(`💻 Device-Host: ${os.hostname()}`);

    // ⭐ Jetzt ist die DB garantiert bereit
    await loadIndustrySectorMap();
    console.log("📚 Industry → Sector Mapping geladen");
});