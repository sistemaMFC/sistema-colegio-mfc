const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    const [tables] = await conn.query("SHOW TABLES LIKE 'usuarios'");
    console.log('usuarios_exists', tables.length);

    const [cols] = await conn.query('SHOW COLUMNS FROM usuarios');
    console.log('columns', cols.map(c => c.Field));

    const [sample] = await conn.query('SELECT * FROM usuarios LIMIT 1');
    console.log('sample', sample.length);

    const [admins] = await conn.query("SELECT COUNT(*) AS count FROM usuarios WHERE rol='ADMIN'");
    console.log('admins', admins[0].count);

    const tryInsert = await conn.query(
      `INSERT INTO usuarios (nombres, apellidos, cedula, password_hash, rol, estado) VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVO')`,
      ['Debugger', 'Check', '0999999998', '$2b$10$A10vtedY0HPeZ4RKGBYADOA/1UtLzrNK1PG1U4chRrpZgbDZ1MecK']
    );
    console.log('inserted', tryInsert[0].insertId);
  } catch (err) {
    console.error('ERR', err.message);
    console.error(err.sql || 'no-sql');
  } finally {
    await conn.end();
  }
})();
