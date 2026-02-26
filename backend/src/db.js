const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * CONFIGURACIÓN DE BASE DE DATOS - COLEGIO MFC
 * Objetivo: Conexión directa a Railway
 */
const pool = mysql.createPool({
    host: 'tramway.proxy.rlwy.net',
    user: 'root',
    password: 'rKgcXCzZQsmLNYSWrvXDSDfePhaKFrLf',
    database: 'sistema_educativo', // El nombre donde están sus tablas
    port: 26000,                    // Puerto público para conectar desde afuera
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// PRUEBA DE CONEXIÓN
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ ¡CONEXIÓN EXITOSA!');
        console.log('El archivo src/db.js ha conectado con sistema_educativo en Railway.');
        connection.release();
    } catch (err) {
        console.error('❌ ERROR DE CONEXIÓN:', err.message);
    }
})();

module.exports = pool;