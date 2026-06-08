-- ============================================================
-- SEED COMPLETO: 1ro Bachillerato + Especialidades + Estudiantes
-- Sistema MFC
-- Fecha: 2026-06-09
-- ============================================================
-- Ejecutar manualmente en MySQL/Railway sobre la BD activa.
-- Este script:
-- 1) Crea tabla especialidades (si no existe)
-- 2) Agrega especialidad_id en matriculas y asignaciones_docente (si no existe)
-- 3) Inserta/normaliza curso 1ro Bachillerato
-- 4) Inserta especialidades:
--    - Desarrollo de Software
--    - Diseño Gráfico
-- 5) Inserta materias:
--    - PROGRAMACIÓN ESTRUCTURADA
--    - BASE DE DATOS
-- 6) Inserta/actualiza estudiantes y matricula en periodo activo por especialidad
-- ============================================================

SET SQL_SAFE_UPDATES = 0;

START TRANSACTION;

-- ------------------------------------------------------------
-- A) TABLA ESPECIALIDADES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS especialidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_especialidad_curso_codigo (curso_id, codigo),
  KEY idx_especialidad_curso (curso_id)
);

-- FK opcional (se intenta; si falla por estructura distinta no rompe script)
SET @fk_especialidades_cursos_exists = (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'especialidades'
    AND CONSTRAINT_NAME = 'fk_especialidades_curso'
);

SET @sql_fk_especialidades_cursos = (
  SELECT IF(
    @fk_especialidades_cursos_exists = 0,
    'ALTER TABLE especialidades ADD CONSTRAINT fk_especialidades_curso FOREIGN KEY (curso_id) REFERENCES cursos(id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql_fk_especialidades_cursos;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- B) CAMPOS ESPECIALIDAD_ID EN MATRICULAS / ASIGNACIONES_DOCENTE
-- ------------------------------------------------------------
SET @sql_add_matriculas_especialidad = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE matriculas ADD COLUMN especialidad_id INT NULL AFTER paralelo_id',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matriculas'
    AND COLUMN_NAME = 'especialidad_id'
);
PREPARE stmt FROM @sql_add_matriculas_especialidad;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_add_asignaciones_especialidad = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE asignaciones_docente ADD COLUMN especialidad_id INT NULL AFTER paralelo_id',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'asignaciones_docente'
    AND COLUMN_NAME = 'especialidad_id'
);
PREPARE stmt FROM @sql_add_asignaciones_especialidad;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índices
SET @sql_idx_matriculas_especialidad = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_matriculas_especialidad ON matriculas (especialidad_id)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matriculas'
    AND INDEX_NAME = 'idx_matriculas_especialidad'
);
PREPARE stmt FROM @sql_idx_matriculas_especialidad;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_idx_asignaciones_especialidad = (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_asignaciones_especialidad ON asignaciones_docente (especialidad_id)',
    'SELECT 1'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'asignaciones_docente'
    AND INDEX_NAME = 'idx_asignaciones_especialidad'
);
PREPARE stmt FROM @sql_idx_asignaciones_especialidad;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK matriculas.especialidad_id -> especialidades.id
SET @fk_matriculas_especialidad_exists = (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matriculas'
    AND CONSTRAINT_NAME = 'fk_matriculas_especialidad'
);

SET @sql_fk_matriculas_especialidad = (
  SELECT IF(
    @fk_matriculas_especialidad_exists = 0,
    'ALTER TABLE matriculas ADD CONSTRAINT fk_matriculas_especialidad FOREIGN KEY (especialidad_id) REFERENCES especialidades(id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql_fk_matriculas_especialidad;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK asignaciones_docente.especialidad_id -> especialidades.id
SET @fk_asignaciones_especialidad_exists = (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'asignaciones_docente'
    AND CONSTRAINT_NAME = 'fk_asignaciones_especialidad'
);

SET @sql_fk_asignaciones_especialidad = (
  SELECT IF(
    @fk_asignaciones_especialidad_exists = 0,
    'ALTER TABLE asignaciones_docente ADD CONSTRAINT fk_asignaciones_especialidad FOREIGN KEY (especialidad_id) REFERENCES especialidades(id)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql_fk_asignaciones_especialidad;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- C) CURSO 1ro BACHILLERATO
-- ------------------------------------------------------------
-- Compatibilidad fuerte con distintos esquemas de cursos:
-- 1) Si existe columna nivel y acepta NULL -> insert/update con nivel = NULL
-- 2) Si existe columna nivel y NO acepta NULL -> tomar nivel de un curso existente
-- 3) Si no existe columna nivel -> insert/update sin nivel

SET @curso_tiene_nivel = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cursos'
    AND COLUMN_NAME = 'nivel'
);

SET @curso_nivel_nullable = (
  SELECT IFNULL(MAX(CASE WHEN IS_NULLABLE = 'YES' THEN 1 ELSE 0 END), 0)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cursos'
    AND COLUMN_NAME = 'nivel'
);

SET @nivel_existente = (
  SELECT nivel
  FROM cursos
  WHERE nivel IS NOT NULL
  ORDER BY id ASC
  LIMIT 1
);

SET @nivel_final = (
  SELECT CASE
    WHEN @curso_tiene_nivel = 0 THEN NULL
    WHEN @curso_nivel_nullable = 1 THEN NULL
    ELSE @nivel_existente
  END
);

SET @sql_insert_bach1 = (
  SELECT CASE
    WHEN @curso_tiene_nivel = 0 THEN
      "INSERT INTO cursos (codigo, nombre, orden, estado, created_at, updated_at)
       SELECT 'BACH1', '1ro Bachillerato', 11, 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       WHERE NOT EXISTS (
         SELECT 1
         FROM cursos
         WHERE codigo = 'BACH1'
            OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO')
       )"
    WHEN @curso_nivel_nullable = 1 THEN
      "INSERT INTO cursos (codigo, nombre, nivel, orden, estado, created_at, updated_at)
       SELECT 'BACH1', '1ro Bachillerato', NULL, 11, 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       WHERE NOT EXISTS (
         SELECT 1
         FROM cursos
         WHERE codigo = 'BACH1'
            OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO')
       )"
    ELSE CONCAT(
      "INSERT INTO cursos (codigo, nombre, nivel, orden, estado, created_at, updated_at)
       SELECT 'BACH1', '1ro Bachillerato', ",
      QUOTE(@nivel_final),
      ", 11, 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       WHERE NOT EXISTS (
         SELECT 1
         FROM cursos
         WHERE codigo = 'BACH1'
            OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO')
       )"
    )
  END
);

PREPARE stmt FROM @sql_insert_bach1;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_update_bach1 = (
  SELECT CASE
    WHEN @curso_tiene_nivel = 0 THEN
      "UPDATE cursos
       SET nombre = '1ro Bachillerato',
           orden = 11,
           estado = 'ACTIVO',
           updated_at = CURRENT_TIMESTAMP
       WHERE codigo = 'BACH1'
          OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO')"
    WHEN @curso_nivel_nullable = 1 THEN
      "UPDATE cursos
       SET nombre = '1ro Bachillerato',
           nivel = NULL,
           orden = 11,
           estado = 'ACTIVO',
           updated_at = CURRENT_TIMESTAMP
       WHERE codigo = 'BACH1'
          OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO')"
    ELSE CONCAT(
      "UPDATE cursos
       SET nombre = '1ro Bachillerato',
           nivel = ",
      QUOTE(@nivel_final),
      ",
           orden = 11,
           estado = 'ACTIVO',
           updated_at = CURRENT_TIMESTAMP
       WHERE codigo = 'BACH1'
          OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO')"
    )
  END
);

PREPARE stmt FROM @sql_update_bach1;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @curso_bach1_id = (
  SELECT id
  FROM cursos
  WHERE codigo = 'BACH1'
     OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO')
  ORDER BY id
  LIMIT 1
);

-- ------------------------------------------------------------
-- D) ESPECIALIDADES BACHILLERATO
-- ------------------------------------------------------------
INSERT INTO especialidades (curso_id, codigo, nombre, estado)
VALUES
  (@curso_bach1_id, 'DSW', 'Desarrollo de Software', 'ACTIVO'),
  (@curso_bach1_id, 'DGR', 'Diseño Gráfico', 'ACTIVO')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  estado = 'ACTIVO',
  updated_at = CURRENT_TIMESTAMP;

SET @esp_dsw_id = (
  SELECT id FROM especialidades
  WHERE curso_id = @curso_bach1_id AND codigo = 'DSW'
  LIMIT 1
);

SET @esp_dgr_id = (
  SELECT id FROM especialidades
  WHERE curso_id = @curso_bach1_id AND codigo = 'DGR'
  LIMIT 1
);

-- ------------------------------------------------------------
-- E) MATERIAS OFICIALES NUEVAS
-- ------------------------------------------------------------
INSERT INTO materias (codigo, nombre, estado, created_at, updated_at)
VALUES
  ('PGE', 'PROGRAMACIÓN ESTRUCTURADA', 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('BDD', 'BASE DE DATOS', 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  estado = 'ACTIVO',
  updated_at = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- F) PERIODO ACTIVO Y PARALELO DEFAULT
-- ------------------------------------------------------------
SET @periodo_activo_id = (
  SELECT id
  FROM periodos_lectivos
  WHERE estado = 'ACTIVO'
  ORDER BY id DESC
  LIMIT 1
);

SET @paralelo_default_id = (
  SELECT id
  FROM paralelos
  WHERE estado = 'ACTIVO'
  ORDER BY CASE WHEN UPPER(nombre) = 'A' THEN 0 ELSE 1 END, nombre ASC
  LIMIT 1
);

-- Si no hay periodo activo, abortar de forma controlada
SET @validar_periodo = IF(@periodo_activo_id IS NULL, (SELECT 1/0), 1);

-- Si no hay paralelo activo, abortar de forma controlada
SET @validar_paralelo = IF(@paralelo_default_id IS NULL, (SELECT 1/0), 1);

-- ------------------------------------------------------------
-- G) LISTA DE ESTUDIANTES (DGR / DSW)
-- ------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_bachillerato_estudiantes;
CREATE TEMPORARY TABLE tmp_bachillerato_estudiantes (
  cedula_est VARCHAR(20) PRIMARY KEY,
  apellidos_est VARCHAR(120) NOT NULL,
  nombres_est VARCHAR(120) NOT NULL,
  especialidad_codigo VARCHAR(10) NOT NULL
);

INSERT INTO tmp_bachillerato_estudiantes (cedula_est, apellidos_est, nombres_est, especialidad_codigo) VALUES
  -- Diseño Gráfico (16)
  ('9901010001', 'ARMAS CARPIO', 'NAOMI PATRICIA', 'DGR'),
  ('9901010002', 'CHANGO CEDENO', 'MAYRA ESTEFANIA', 'DGR'),
  ('9901010003', 'COROZO ORTIZ', 'JOHANNA NATASHA', 'DGR'),
  ('9901010004', 'CRESPIN ZAMBRANO', 'ELIZABETH FERNANDA', 'DGR'),
  ('9901010005', 'GARCIA JURADO', 'ARIEL JEREMIAS', 'DGR'),
  ('9901010006', 'LEON PICO', 'JACK JADEN', 'DGR'),
  ('9901010007', 'MORAN LUDIZACA', 'ALESSANDRO MATIAS', 'DGR'),
  ('9901010008', 'MOROCHO GIL', 'JUSTIN DYLAN', 'DGR'),
  ('9901010009', 'PACHO AYONA', 'ANDY MATHIAS', 'DGR'),
  ('9901010010', 'PALACIOS LEONES', 'JUSTIN SANTIAGO', 'DGR'),
  ('9901010011', 'PAREDES FLOREANO', 'DAINA ISABELA', 'DGR'),
  ('9901010012', 'PINELA CEDENO', 'ANAILA AYLEEN', 'DGR'),
  ('9901010013', 'RUIZ NAVARRO', 'MATHIAS LEONEL', 'DGR'),
  ('9901010014', 'SALAZAR CANAR', 'ASHLEY MAITE', 'DGR'),
  ('9901010015', 'SIERRA CAMPOVERDE', 'BIANCA ISABELLA', 'DGR'),
  ('9901010016', 'VILLACRESES TREJO', 'JUAN PABLO', 'DGR'),

  -- Desarrollo de Software (17)
  ('9901020001', 'CASTILLO MAQUILON', 'JOSE ANTONIO', 'DSW'),
  ('9901020002', 'CRESPO RAMIREZ', 'JEREMY ISAAC', 'DSW'),
  ('9901020003', 'FERNANDEZ CHACON', 'DAVID MATHIAS', 'DSW'),
  ('9901020004', 'GOMEZ CRUZ', 'DOMINICK YASMANY', 'DSW'),
  ('9901020005', 'IZQUIERDO SUAREZ', 'VIOLETA ARIADNA', 'DSW'),
  ('9901020006', 'LLUMIGUSIN RODRIGUEZ', 'VICTOR LEONIDAS', 'DSW'),
  ('9901020007', 'MACIAS PALACIOS', 'TADEO ANTONIO', 'DSW'),
  ('9901020008', 'MARCILLO GARCIA', 'NAYELI GIANELLA', 'DSW'),
  ('9901020009', 'MENENDEZ MORA', 'ERICK MATTEW', 'DSW'),
  ('9901020010', 'MERCHAN VERA', 'ALEX EDUARDO', 'DSW'),
  ('9901020011', 'MERO RONQUILLO', 'JAIR IGNACIO', 'DSW'),
  ('9901020012', 'NAVARRO GARCIA', 'DIEGO ANDERSON', 'DSW'),
  ('9901020013', 'PENARRIETA SALTOS', 'MIA CORINA', 'DSW'),
  ('9901020014', 'ROMERO SANCHEZ', 'CAMILO ADRIAN', 'DSW'),
  ('9901020015', 'SANDOYA ROSADO', 'JEFFREY JOEL', 'DSW'),
  ('9901020016', 'SUMBA MOSQUERA', 'TOMAS YAAHZIEL', 'DSW'),
  ('9901020017', 'ZURITA MELO', 'JOSE VICENTE', 'DSW');

-- ------------------------------------------------------------
-- H) UPSERT DE ESTUDIANTES
-- ------------------------------------------------------------
-- Insert dinámico para compatibilidad con esquemas donde estudiantes exige campos NOT NULL adicionales (ej: fecha_nac)
SET @est_tiene_fecha_nac = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estudiantes'
    AND COLUMN_NAME = 'fecha_nac'
);

SET @est_fecha_nac_nullable = (
  SELECT IFNULL(MAX(CASE WHEN IS_NULLABLE = 'YES' THEN 1 ELSE 0 END), 0)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estudiantes'
    AND COLUMN_NAME = 'fecha_nac'
);

-- Detectar campos obligatorios sin default para construir INSERT seguro
SET @est_req_nombre_rep = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estudiantes'
    AND COLUMN_NAME = 'nombre_rep'
    AND IS_NULLABLE = 'NO'
    AND COLUMN_DEFAULT IS NULL
);

SET @est_req_cedula_rep = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estudiantes'
    AND COLUMN_NAME = 'cedula_rep'
    AND IS_NULLABLE = 'NO'
    AND COLUMN_DEFAULT IS NULL
);

SET @est_req_telefono_rep = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estudiantes'
    AND COLUMN_NAME = 'telefono_rep'
    AND IS_NULLABLE = 'NO'
    AND COLUMN_DEFAULT IS NULL
);

SET @est_req_genero = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estudiantes'
    AND COLUMN_NAME = 'genero'
    AND IS_NULLABLE = 'NO'
    AND COLUMN_DEFAULT IS NULL
);

SET @est_req_fecha_nac = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estudiantes'
    AND COLUMN_NAME = 'fecha_nac'
    AND IS_NULLABLE = 'NO'
    AND COLUMN_DEFAULT IS NULL
);

SET @est_req_parentesco_rep = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estudiantes'
    AND COLUMN_NAME = 'parentesco_rep'
    AND IS_NULLABLE = 'NO'
    AND COLUMN_DEFAULT IS NULL
);

SET @est_req_celular_rep = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'estudiantes'
    AND COLUMN_NAME = 'celular_rep'
    AND IS_NULLABLE = 'NO'
    AND COLUMN_DEFAULT IS NULL
);

SET @cols_est = 'cedula_est, nombres_est, apellidos_est';
SET @vals_est = 't.cedula_est, t.nombres_est, t.apellidos_est';

SET @cols_est = IF(@est_req_fecha_nac = 1, CONCAT(@cols_est, ', fecha_nac'), @cols_est);
SET @vals_est = IF(@est_req_fecha_nac = 1, CONCAT(@vals_est, ", '2010-01-01'"), @vals_est);

SET @cols_est = IF(@est_req_nombre_rep = 1, CONCAT(@cols_est, ', nombre_rep'), @cols_est);
SET @vals_est = IF(@est_req_nombre_rep = 1, CONCAT(@vals_est, ", 'REPRESENTANTE NO DEFINIDO'"), @vals_est);

SET @cols_est = IF(@est_req_cedula_rep = 1, CONCAT(@cols_est, ', cedula_rep'), @cols_est);
SET @vals_est = IF(@est_req_cedula_rep = 1, CONCAT(@vals_est, ", '0000000000'"), @vals_est);

SET @cols_est = IF(@est_req_telefono_rep = 1, CONCAT(@cols_est, ', telefono_rep'), @cols_est);
SET @vals_est = IF(@est_req_telefono_rep = 1, CONCAT(@vals_est, ", '0999999999'"), @vals_est);

SET @cols_est = IF(@est_req_parentesco_rep = 1, CONCAT(@cols_est, ', parentesco_rep'), @cols_est);
SET @vals_est = IF(@est_req_parentesco_rep = 1, CONCAT(@vals_est, ", 'PADRE/MADRE'"), @vals_est);

SET @cols_est = IF(@est_req_celular_rep = 1, CONCAT(@cols_est, ', celular_rep'), @cols_est);
SET @vals_est = IF(@est_req_celular_rep = 1, CONCAT(@vals_est, ", '0999999999'"), @vals_est);

SET @cols_est = IF(@est_req_genero = 1, CONCAT(@cols_est, ', genero'), @cols_est);
SET @vals_est = IF(@est_req_genero = 1, CONCAT(@vals_est, ", 'M'"), @vals_est);

SET @cols_est = CONCAT(@cols_est, ', curso_id, estado');
SET @vals_est = CONCAT(@vals_est, ', @curso_bach1_id, ''ACTIVO''');

SET @sql_insert_estudiantes = CONCAT(
  'INSERT INTO estudiantes (', @cols_est, ')
   SELECT ', @vals_est, '
   FROM tmp_bachillerato_estudiantes t
   WHERE NOT EXISTS (
     SELECT 1
     FROM estudiantes e
     WHERE e.cedula_est = t.cedula_est
   )'
);

PREPARE stmt FROM @sql_insert_estudiantes;
EXECUTE stmt;

UPDATE estudiantes e
JOIN tmp_bachillerato_estudiantes t
  ON t.cedula_est = e.cedula_est
SET
  e.nombres_est = t.nombres_est,
  e.apellidos_est = t.apellidos_est,
  e.curso_id = @curso_bach1_id,
  e.estado = 'ACTIVO';

-- ------------------------------------------------------------
-- I) MATRICULAR EN PERIODO ACTIVO CON ESPECIALIDAD
-- ------------------------------------------------------------
-- Compatibilidad con ENUM de matriculas.estado
SET @mat_estado_type = (
  SELECT DATA_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matriculas'
    AND COLUMN_NAME = 'estado'
  LIMIT 1
);

SET @mat_estado_enum = (
  SELECT COLUMN_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matriculas'
    AND COLUMN_NAME = 'estado'
  LIMIT 1
);

SET @mat_estado_final = (
  SELECT CASE
    WHEN @mat_estado_type <> 'enum' THEN 'MATRICULADO'
    WHEN @mat_estado_enum LIKE '%MATRICULADO%' THEN 'MATRICULADO'
    WHEN @mat_estado_enum LIKE '%ACTIVO%' THEN 'ACTIVO'
    WHEN @mat_estado_enum LIKE '%PENDIENTE%' THEN 'PENDIENTE'
    ELSE (
      SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(@mat_estado_enum, "'", 2), "'", -1)
    )
  END
);

SET @sql_insert_matriculas = CONCAT(
  "INSERT INTO matriculas (
     estudiante_id,
     periodo_id,
     curso_id,
     paralelo_id,
     especialidad_id,
     fecha_registro,
     estado
   )
   SELECT
     e.id,
     @periodo_activo_id,
     @curso_bach1_id,
     @paralelo_default_id,
     CASE WHEN t.especialidad_codigo = 'DGR' THEN @esp_dgr_id ELSE @esp_dsw_id END,
     CURDATE(),
     ", QUOTE(@mat_estado_final), "
   FROM estudiantes e
   JOIN tmp_bachillerato_estudiantes t
     ON t.cedula_est = e.cedula_est
   WHERE NOT EXISTS (
     SELECT 1
     FROM matriculas m
     WHERE m.estudiante_id = e.id
       AND m.periodo_id = @periodo_activo_id
   )"
);
PREPARE stmt FROM @sql_insert_matriculas;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql_update_matriculas = CONCAT(
  "UPDATE matriculas m
   JOIN estudiantes e
     ON e.id = m.estudiante_id
   JOIN tmp_bachillerato_estudiantes t
     ON t.cedula_est = e.cedula_est
   SET
     m.curso_id = @curso_bach1_id,
     m.paralelo_id = @paralelo_default_id,
     m.especialidad_id = CASE WHEN t.especialidad_codigo = 'DGR' THEN @esp_dgr_id ELSE @esp_dsw_id END,
     m.estado = ", QUOTE(@mat_estado_final), "
   WHERE m.periodo_id = @periodo_activo_id
     AND m.id > 0"
);
PREPARE stmt FROM @sql_update_matriculas;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- J) RESULTADOS DE CONTROL
-- ------------------------------------------------------------
SELECT
  c.id,
  c.codigo,
  c.nombre,
  c.nivel,
  c.estado
FROM cursos c
WHERE c.id = @curso_bach1_id;

SELECT
  esp.id,
  esp.codigo,
  esp.nombre,
  esp.estado
FROM especialidades esp
WHERE esp.curso_id = @curso_bach1_id
ORDER BY esp.nombre;

SELECT
  m.codigo,
  m.nombre,
  m.estado
FROM materias m
WHERE m.codigo IN ('PGE', 'BDD')
ORDER BY m.codigo;

SELECT
  esp.nombre AS especialidad,
  COUNT(m.id) AS total_estudiantes
FROM especialidades esp
LEFT JOIN matriculas m
  ON m.especialidad_id = esp.id
 AND m.periodo_id = @periodo_activo_id
 AND m.estado IN ('ACTIVO','MATRICULADO')
WHERE esp.curso_id = @curso_bach1_id
GROUP BY esp.id, esp.nombre
ORDER BY esp.nombre;

COMMIT;

SET SQL_SAFE_UPDATES = 1;
