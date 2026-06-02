-- Modelo academico por trimestres, parciales dinamicos, insumos y examen.
-- Ejecutar en Railway MySQL antes de usar la nueva pantalla de Insumos.

CREATE TABLE IF NOT EXISTS academico_parciales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asignacion_id INT NOT NULL,
  trimestre_id INT NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  orden INT NOT NULL DEFAULT 1,
  estado ENUM('ABIERTO','CERRADO') NOT NULL DEFAULT 'ABIERTO',
  cerrado_por INT NULL,
  cerrado_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parcial_asignacion_trim_orden (asignacion_id, trimestre_id, orden),
  KEY idx_parcial_asignacion_trim (asignacion_id, trimestre_id)
);

CREATE TABLE IF NOT EXISTS academico_insumos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parcial_id INT NOT NULL,
  tipo ENUM('TAREA','LECCION','TALLER','INDIVIDUAL','APORTE') NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  orden INT NOT NULL DEFAULT 1,
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_insumo_parcial_tipo_orden (parcial_id, tipo, orden),
  KEY idx_insumo_parcial (parcial_id)
);

CREATE TABLE IF NOT EXISTS academico_notas_insumos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  insumo_id INT NOT NULL,
  matricula_id INT NOT NULL,
  nota DECIMAL(5,2) NOT NULL,
  observacion VARCHAR(255) NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_nota_insumo_matricula (insumo_id, matricula_id),
  KEY idx_nota_matricula (matricula_id)
);

CREATE TABLE IF NOT EXISTS academico_examenes_trimestrales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asignacion_id INT NOT NULL,
  trimestre_id INT NOT NULL,
  matricula_id INT NOT NULL,
  nota DECIMAL(5,2) NOT NULL,
  observacion VARCHAR(255) NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_examen_asig_trim_matricula (asignacion_id, trimestre_id, matricula_id),
  KEY idx_examen_trim (asignacion_id, trimestre_id)
);
