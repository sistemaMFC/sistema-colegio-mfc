const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * CONFIGURACIÓN DE CONEXIÓN A RAILWAY
 * Usamos un Pool para manejar múltiples conexiones de los docentes/alumnos
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'tramway.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rKgcXCzZQsmLNYSWrvXDSDfePhaKFrLf',
    database: process.env.DB_NAME || 'railway',
    port: process.env.DB_PORT || 26000, // IMPORTANTE: Puerto público de Railway
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificación de conexión inicial
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión exitosa a la base de datos de Railway (Puerto 26000)');
        connection.release();
    } catch (error) {
        console.error('❌ Error de conexión a la base de datos:', error.message);
    }
})();

module.exports = pool;