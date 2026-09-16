-- Migración segura para soportar múltiples roles por usuario
-- Mantiene compatibilidad con la columna usuarios.rol actual.

CREATE TABLE IF NOT EXISTS roles (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usuario_roles (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  rol_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_rol (usuario_id, rol_id),
  KEY idx_usuario_roles_usuario_id (usuario_id),
  KEY idx_usuario_roles_rol_id (rol_id),
  CONSTRAINT fk_usuario_roles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_usuario_roles_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Datos base para compatibilidad del sistema
INSERT INTO roles (nombre, descripcion, estado)
SELECT * FROM (
  SELECT 'ADMINISTRADOR' AS nombre, 'Acceso total del sistema' AS descripcion, 'ACTIVO' AS estado
  UNION ALL
  SELECT 'PROFESOR', 'Acceso al módulo profesor', 'ACTIVO'
  UNION ALL
  SELECT 'PSICOLOGO', 'Acceso al módulo DECE', 'ACTIVO'
  UNION ALL
  SELECT 'SECRETARIA', 'Asistencia administrativa', 'ACTIVO'
  UNION ALL
  SELECT 'COLECTOR', 'Gestión de cobros y pagos', 'ACTIVO'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = tmp.nombre);

-- Migración de usuarios actuales a usuario_roles
INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id
FROM usuarios u
JOIN roles r ON r.nombre = CASE
  WHEN u.rol = 'ADMIN' THEN 'ADMINISTRADOR'
  ELSE u.rol
END
WHERE u.estado = 'ACTIVO'
ON DUPLICATE KEY UPDATE usuario_id = usuario_id;

-- Nota: la columna usuarios.rol se conserva para compatibilidad con la lógica actual del sistema.
-- El modelo nuevo será multirol con usuario_roles, pero sin romper usuarios ya creados.
