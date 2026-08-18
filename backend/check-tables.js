require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
  });

  const tablesRequeridas = [
    'academico_parciales',
    'academico_insumos',
    'academico_notas_insumos',
    'academico_examenes_trimestrales'
  ];

  try {
    const [tables] = await pool.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
      [process.env.DB_NAME]
    );
    
    const existentes = new Set(tables.map(t => t.TABLE_NAME));
    const resultado = {};
    
    for (const tabla of tablesRequeridas) {
      resultado[tabla] = existentes.has(tabla) ? 'SI' : 'NO';
    }
    
    console.log(JSON.stringify(resultado, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
