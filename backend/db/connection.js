const sql = require('mssql');

// --- ZENTRALE LAPTOP-EINSTELLUNGEN ---
// Wir nutzen die IP und den festen Port, um Instanznamen-Probleme zu umgehen.
const SERVER_IP = '127.0.0.1'; 
const SQL_PORT = 1433; 

const commonOptions = {
  encrypt: false, // Auf dem Laptop lokal fast immer false
  trustServerCertificate: true, 
  requestTimeout: 60000,
  // WICHTIG: Wenn wir über Port 1433 gehen, lassen wir den Instanznamen weg
  // Falls es trotzdem nicht geht, füge hier wieder instanceName: 'SQLEXPRESS' hinzu
};

// -------------------------
//   CONFIGS
// -------------------------

const yahooConfig = {
  user: 'trading',
  password: 'trading',
  server: SERVER_IP,
  port: SQL_PORT, 
  database: 'yahoo',
  options: commonOptions,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

const tradingConfig = {
  user: 'trading',
  password: 'trading',
  server: SERVER_IP,
  port: SQL_PORT,
  database: 'trading',
  options: commonOptions,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

const journalConfig = {
  user: 'trading',
  password: 'trading',
  server: SERVER_IP,
  port: SQL_PORT,
  database: 'TradingJournal',
  options: commonOptions,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

// -------------------------
//   POOLS & VERBINDUNGEN
// -------------------------

const yahooPool = new sql.ConnectionPool(yahooConfig);
const tradingPool = new sql.ConnectionPool(tradingConfig);
const journalPool = new sql.ConnectionPool(journalConfig);

const yahooConnect = yahooPool.connect().catch(err => console.error('❌ Fehler Yahoo-Pool:', err.message));
const tradingConnect = tradingPool.connect().catch(err => console.error('❌ Fehler Trading-Pool:', err.message));
const journalConnect = journalPool.connect().catch(err => console.error('❌ Fehler Journal-Pool:', err.message));

module.exports = {
  sql,
  yahooPool,
  tradingPool,
  journalPool,
  yahooConnect,
  tradingConnect,
  journalConnect,
  config: tradingConfig 
};