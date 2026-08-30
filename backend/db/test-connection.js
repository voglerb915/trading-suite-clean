const sql = require("mssql");

const SERVER_IP = '127.0.0.1';
const SQL_PORT = 1433;

const config = {
    user: 'trading',
    password: 'trading',
    server: SERVER_IP,
    port: SQL_PORT,
    database: 'trading',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function testConnection() {
    console.log("🔌 TEST: SQL-Verbindung wird geprüft...");

    try {
        const pool = await sql.connect(config);
        console.log("🟩 SQL CONNECT OK");
        const result = await pool.request().query("SELECT 1 AS ok");
        console.log("🟩 TESTQUERY OK:", result.recordset);
    } catch (err) {
        console.log("🟥 SQL CONNECT FAILED");
        console.error(err);
    }
}

testConnection();
