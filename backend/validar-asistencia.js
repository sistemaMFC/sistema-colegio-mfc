require('dotenv').config();
const mysql = require('mysql2/promise');

const required = ['asistencia', 'tutorias'];

async function main() {
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    connectTimeout: 20000,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 1,
  };

  console.log('== VALIDACION ASISTENCIA ==');
  console.log('DB_HOST:', config.host);
  console.log('DB_NAME:', config.database);

  const pool = mysql.createPool(config);

  try {
    const conn = await pool.getConnection();
    console.log('✅ Conexion a MySQL establecida');

    const [tables] = await conn.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [config.database]
    );
    const set = new Set(tables.map(t => t.TABLE_NAME));

    console.log('\nTablas requeridas:');
    for (const name of required) {
      console.log(`- ${name}: ${set.has(name) ? 'EXISTE' : 'FALTA'}`);
    }

    for (const name of required.filter(n => set.has(n))) {
      const [cols] = await conn.query('SHOW COLUMNS FROM `' + name + '`');
      console.log(`\nSchema ${name}:`);
      console.log(JSON.stringify(cols.map(c => ({
        field: c.Field,
        type: c.Type,
        null: c.Null,
        key: c.Key,
        default: c.Default,
      })), null, 2));
    }

    const [periodo] = await conn.query(
      "SELECT id, nombre, estado FROM periodos_lectivos ORDER BY id DESC LIMIT 5"
    );
    console.log('\nPeriodos lectivos:');
    console.log(JSON.stringify(periodo, null, 2));

    const [tutorias] = await conn.query(
      "SELECT id, docente_usuario_id, curso_id, paralelo_id, periodo_id, estado FROM tutorias ORDER BY id DESC LIMIT 10"
    );
    console.log('\nTutorias activas recientes:');
    console.log(JSON.stringify(tutorias, null, 2));

    conn.release();
    console.log('\n✅ Validacion finalizada.');
  } catch (err) {
    console.error('\n❌ ERROR DE VALIDACION:');
    console.error('message:', err.message);
    console.error('code:', err.code);
    console.error('sqlState:', err.sqlState);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch (_) {}
  }
}

main();
