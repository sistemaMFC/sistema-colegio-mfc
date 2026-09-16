const mysql = require("mysql2/promise");
require("dotenv").config({ path: "./.env" });

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 5
  });

  try {
    await pool.query("ALTER TABLE usuarios MODIFY COLUMN rol ENUM('ADMIN','PROFESOR','SECRETARIA','COLECTOR','PSICOLOGO') NOT NULL DEFAULT 'ADMIN'");
    console.log("ENUM usuarios.rol actualizado con PSICOLOGO");
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
})();
