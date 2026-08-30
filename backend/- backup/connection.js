const sql = require('mssql');

// -------------------------
//   CONFIGS
// -------------------------

const yahooConfig = {
  user: 'trading',
  password: 'trading',
  server: 'localhost',
  port: 1433,
  database: 'yahoo',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 60000
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

const tradingConfig = {
  user: 'trading',
  password: 'trading',
  server: 'localhost',
  port: 1433,
  database: 'trading',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 60000
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

// NEU: Journal Config
const journalConfig = {
  user: 'trading',
  password: 'trading',
  server: 'localhost',
  port: 1433,
  database: 'TradingJournal', // Deine neue DB
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 60000
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

// -------------------------
//   POOLS
// -------------------------

const yahooPool = new sql.ConnectionPool(yahooConfig);
const tradingPool = new sql.ConnectionPool(tradingConfig);
const journalPool = new sql.ConnectionPool(journalConfig); // Neuer Pool

// -------------------------
//   VERBINDUNGEN STARTEN
// -------------------------

const yahooConnect = yahooPool.connect();
const tradingConnect = tradingPool.connect();
const journalConnect = journalPool.connect(); // Verbindung starten

// -------------------------
//   EXPORTS
// -------------------------

module.exports = {
  sql,
  yahooConfig,
  tradingConfig,
  journalConfig,
  yahooPool,
  tradingPool,
  journalPool,      // Export für neue Journal-Routen
  yahooConnect,
  tradingConnect,
  journalConnect,
  defaultConfig: tradingConfig

};