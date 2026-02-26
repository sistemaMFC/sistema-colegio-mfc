const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * CONFIGURACIÓN DE BASE DE DATOS PARA EL COLEGIO MFC
 * Conexión desde Render hacia Railway
 */
const pool = mysql.createPool({
    // Usamos las variables de entorno o los valores directos de su Railway como respaldo
    host: process.env.DB_HOST || 'tramway.proxy.rlwy.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rKgcXCzZQsmLNYSWrvXDSDfePhaKFrLf',
    database: process.env.DB_NAME || 'railway', 
    port: process.env.DB_PORT || 26000, // Puerto público vital para Render
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificación de salud de la conexión
pool.getConnection()
    .then(connection => {
        console.log('✅ Conexión establecida con la base de datos en Railway (Puerto 26000)');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Error crítico de conexión a la base de datos:', err.message);
    });

module.exports = pool;