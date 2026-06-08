-- Modelo academico por trimestres, parciales dinamicos, insumos y examen.
-- Ejecutar en Railway/MySQL Workbench dentro del schema sistema_educativo.
-- Script idempotente: puede correrse varias veces sin romper datos existentes.

USE sistema_educativo;

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
  KEY idx_parcial_asignacion_trim (asignacion_id, trimestre_id),
  CONSTRAINT fk_ap_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones_docente(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ap_trimestre FOREIGN KEY (trimestre_id) REFERENCES trimestres(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_insumo_parcial (parcial_id),
  CONSTRAINT fk_ai_parcial FOREIGN KEY (parcial_id) REFERENCES academico_parciales(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_nota_matricula (matricula_id),
  CONSTRAINT fk_ani_insumo FOREIGN KEY (insumo_id) REFERENCES academico_insumos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ani_matricula FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_examen_trim (asignacion_id, trimestre_id),
  CONSTRAINT fk_aet_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones_docente(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_aet_trimestre FOREIGN KEY (trimestre_id) REFERENCES trimestres(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_aet_matricula FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
