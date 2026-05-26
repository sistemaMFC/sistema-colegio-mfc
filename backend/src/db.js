/* ============================================================
   CONEXIÓN BD — COLEGIO MFC
   ✅ CORREGIDO: Credenciales en .env, nunca en el código
   ============================================================ */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ CONECTADO A:', process.env.DB_NAME);
        conn.release();
    } catch (err) {
        console.error('❌ ERROR DE CONEXIÓN:', err.message);
        process.exit(1);
    }
})();

module.exports = pool;