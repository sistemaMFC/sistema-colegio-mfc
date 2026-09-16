require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        descripcion VARCHAR(255) NULL,
        estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        rol_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_usuario_rol (usuario_id, rol_id),
        KEY idx_usuario_roles_usuario_id (usuario_id),
        KEY idx_usuario_roles_rol_id (rol_id),
        CONSTRAINT fk_usuario_roles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_usuario_roles_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM roles');
    if (Number(rows[0].total) === 0) {
      await pool.query(`
        INSERT INTO roles (nombre, descripcion, estado) VALUES
        ('ADMINISTRADOR', 'Acceso total del sistema', 'ACTIVO'),
        ('PROFESOR', 'Acceso al módulo profesor', 'ACTIVO'),
        ('PSICOLOGO', 'Acceso al módulo DECE', 'ACTIVO'),
        ('SECRETARIA', 'Asistencia administrativa', 'ACTIVO'),
        ('COLECTOR', 'Gestión de cobros y pagos', 'ACTIVO')
      `);
    }

    const [users] = await pool.query('SELECT id, rol FROM usuarios WHERE estado = "ACTIVO"');
    for (const user of users) {
      const desired = user.rol === 'ADMIN' ? 'ADMINISTRADOR' : user.rol;
      await pool.query(
        `INSERT INTO usuario_roles (usuario_id, rol_id)
         SELECT ?, id FROM roles WHERE nombre = ?
         ON DUPLICATE KEY UPDATE usuario_id = usuario_id`,
        [user.id, desired]
      );
    }

    console.log('✅ Migración de roles completada');
    console.log('✅ Roles y usuario_roles creados correctamente');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error en migración:', err.message);
  process.exit(1);
});
