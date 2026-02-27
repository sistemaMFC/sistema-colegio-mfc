const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'tramway.proxy.rlwy.net',
    user: 'root',
    password: 'rKgcXCzZQsmLNYSWrvXDSDfePhaKFrLf',
    database: 'sistema_educativo', // Nombre real de sus tablas
    port: 26000,                    // Puerto público para conectar desde afuera
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Prueba automática de conexión
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ CONECTADO EXITOSAMENTE A SISTEMA_EDUCATIVO');
        connection.release();
    } catch (err) {
        console.error('❌ ERROR DE CONEXIÓN:', err.message);
    }
})();

module.exports = pool;