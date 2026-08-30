const express = require('express');
const compression = require('compression');
const path = require('path');
const cors = require('cors');
const logger = require('./utils/logger');
const { getTradingDate, saveWithArchive } = require('./utils/dateHelper');

const app = express();

// ---------------------------------------------
// 1. Middleware
// ---------------------------------------------
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Logging Wrapper
app.use((req, res, next) => {
    const oldJson = res.json;
    res.json = function (data) {
        logger.info('RESPONSE', `${req.method} ${req.url}`);
        return oldJson.call(this, data);
    };
    next();
});

// ---------------------------------------------
// 2. API-Routen
// ---------------------------------------------
app.use('/api/volume-metrics', require('./routes/volumeMetrics'));
app.use('/api/daily-history', require('./routes/dailyHistory'));
app.use('/api/journal', require('./routes/journal')); // <--- DIESE ZEILE HINZUFÜGEN

// ---------------------------------------------
// 3. STATIC FRONTEND SERVING (Multi-Tool)
// ---------------------------------------------

// Basis-Pfad zum Frontend
const FRONTEND_ROOT = path.join(__dirname, '../frontend');

// Cockpit
app.use('/cockpit', express.static(path.join(FRONTEND_ROOT, 'apps/cockpit')));

// Lab
app.use('/lab', express.static(path.join(FRONTEND_ROOT, 'apps/lab')));

// Dashboard
app.use('/dashboard', express.static(path.join(FRONTEND_ROOT, 'apps/dashboard')));

// Journal
app.use('/journal', express.static(path.join(FRONTEND_ROOT, 'apps/journal')));

// Charting-Tool
app.use('/charting-tool', express.static(path.join(FRONTEND_ROOT, 'apps/charting-tool')));

// Control-Center
app.use('/control-center', express.static(path.join(FRONTEND_ROOT, 'apps/control-center')));

// Shared
app.use('/shared', express.static(path.join(FRONTEND_ROOT, 'shared')));

// ---------------------------------------------
// 4. Fallback: Root → Cockpit
// ---------------------------------------------
app.get('/', (req, res) => {
    res.redirect('/cockpit');
});

// ---------------------------------------------
// 5. Error Handler
// ---------------------------------------------
app.use((err, req, res, next) => {
    logger.error('SERVER', `${req.method} ${req.url} → ${err.message}`);
    res.status(500).json({ error: 'Interner Serverfehler' });
});

// ---------------------------------------------
// 6. Start Server
// ---------------------------------------------
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Trading-Suite Backend läuft auf Port ${PORT}`);
    console.log(`Trading-Date: ${getTradingDate()}`);
});
