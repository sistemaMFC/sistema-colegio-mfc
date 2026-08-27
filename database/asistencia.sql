-- =============================================================
-- FASE 6: ASISTENCIA Y TUTORIAS
-- ESTRUCTURA REAL EN LA BASE ACTUAL DEL SISTEMA
-- =============================================================

CREATE TABLE IF NOT EXISTS tutorias (
  id INT NOT NULL AUTO_INCREMENT,
  docente_usuario_id INT NOT NULL,
  periodo_id INT NOT NULL,
  curso_id INT NOT NULL,
  paralelo_id INT NOT NULL,
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tutoria_docente_curso_paralelo_periodo (docente_usuario_id, curso_id, paralelo_id, periodo_id),
  KEY idx_tutorias_docente (docente_usuario_id, periodo_id, estado),
  KEY idx_tutorias_curso (curso_id, paralelo_id, periodo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- La tabla real del sistema es `asistencia` (singular), no `asistencias`.
-- Guarda una fila por matricula y fecha.
CREATE TABLE IF NOT EXISTS asistencia (
  id INT NOT NULL AUTO_INCREMENT,
  matricula_id INT NOT NULL,
  fecha DATE NOT NULL,
  estado ENUM('P','A','T','J') NOT NULL DEFAULT 'P',
  observacion VARCHAR(200) DEFAULT NULL,
  registrado_por INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_asis_unica (matricula_id, fecha),
  KEY fk_asis_usuario (registrado_por),
  KEY idx_asis_fecha (fecha),
  KEY idx_asis_matricula (matricula_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'tutorias' AS tabla, COUNT(*) AS total FROM tutorias;
SELECT 'asistencia' AS tabla, COUNT(*) AS total FROM asistencia;
