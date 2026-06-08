-- Bachillerato, especialidades y estudiantes iniciales MFC
-- Fecha: 2026-06-08
--
-- Ejecutar en Railway / MySQL sobre la base de datos de produccion.
-- Objetivo:
-- 1. Crear la estructura de especialidades si no existe.
-- 2. Agregar 1ro Bachillerato.
-- 3. Crear las especialidades Desarrollo de Software y Diseño Gráfico.
-- 4. Agregar materias PROGRAMACIÓN ESTRUCTURADA y BASE DE DATOS.
-- 5. Registrar estudiantes iniciales por especialidad y matricularlos en el periodo activo.

START TRANSACTION;

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

INSERT INTO cursos (codigo, nombre, nivel, orden, estado, created_at, updated_at)
SELECT 'BACH1', '1ro Bachillerato', 'BACHILLERATO', 11, 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM cursos WHERE codigo = 'BACH1' OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO')
);

UPDATE cursos
SET nombre = '1ro Bachillerato',
    nivel = 'BACHILLERATO',
    orden = 11,
    estado = 'ACTIVO',
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'BACH1'
   OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO');

SET @curso_bach1_id = (
  SELECT id FROM cursos
  WHERE codigo = 'BACH1'
     OR UPPER(TRIM(nombre)) IN ('1RO BACHILLERATO', '1° BACHILLERATO', 'PRIMERO DE BACHILLERATO')
  ORDER BY id
  LIMIT 1
);

INSERT INTO especialidades (curso_id, codigo, nombre, estado)
VALUES
  (@curso_bach1_id, 'DSW', 'Desarrollo de Software', 'ACTIVO'),
  (@curso_bach1_id, 'DGR', 'Diseño Gráfico', 'ACTIVO')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  estado = 'ACTIVO',
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO materias (codigo, nombre, estado, created_at, updated_at)
VALUES
  ('PGE', 'PROGRAMACIÓN ESTRUCTURADA', 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('BDD', 'BASE DE DATOS', 'ACTIVO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  estado = 'ACTIVO',
  updated_at = CURRENT_TIMESTAMP;

SET @periodo_activo_id = (SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1);
SET @paralelo_default_id = (
  SELECT id FROM paralelos
  WHERE estado = 'ACTIVO'
  ORDER BY CASE WHEN UPPER(nombre) = 'A' THEN 0 ELSE 1 END, nombre ASC
  LIMIT 1
);
SET @esp_dgr_id = (SELECT id FROM especialidades WHERE curso_id = @curso_bach1_id AND codigo = 'DGR' LIMIT 1);
SET @esp_dsw_id = (SELECT id FROM especialidades WHERE curso_id = @curso_bach1_id AND codigo = 'DSW' LIMIT 1);

CREATE TEMPORARY TABLE tmp_bachillerato_estudiantes (
  cedula_est VARCHAR(20) PRIMARY KEY,
  apellidos_est VARCHAR(120) NOT NULL,
  nombres_est VARCHAR(120) NOT NULL,
  especialidad_codigo VARCHAR(10) NOT NULL
);

INSERT INTO tmp_bachillerato_estudiantes (cedula_est, apellidos_est, nombres_est, especialidad_codigo) VALUES
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

INSERT INTO estudiantes (cedula_est, nombres_est, apellidos_est, curso_id, estado)
SELECT t.cedula_est, t.nombres_est, t.apellidos_est, @curso_bach1_id, 'ACTIVO'
FROM tmp_bachillerato_estudiantes t
WHERE NOT EXISTS (
  SELECT 1 FROM estudiantes e WHERE e.cedula_est = t.cedula_est
);

UPDATE estudiantes e
JOIN tmp_bachillerato_estudiantes t ON t.cedula_est = e.cedula_est
SET e.nombres_est = t.nombres_est,
    e.apellidos_est = t.apellidos_est,
    e.curso_id = @curso_bach1_id,
    e.estado = 'ACTIVO';

INSERT INTO matriculas (estudiante_id, periodo_id, curso_id, paralelo_id, especialidad_id, fecha_registro, estado)
SELECT
  e.id,
  @periodo_activo_id,
  @curso_bach1_id,
  @paralelo_default_id,
  CASE WHEN t.especialidad_codigo = 'DGR' THEN @esp_dgr_id ELSE @esp_dsw_id END,
  CURDATE(),
  'MATRICULADO'
FROM estudiantes e
JOIN tmp_bachillerato_estudiantes t ON t.cedula_est = e.cedula_est
WHERE @periodo_activo_id IS NOT NULL
  AND @paralelo_default_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM matriculas m
    WHERE m.estudiante_id = e.id
      AND m.periodo_id = @periodo_activo_id
  );

UPDATE matriculas m
JOIN estudiantes e ON e.id = m.estudiante_id
JOIN tmp_bachillerato_estudiantes t ON t.cedula_est = e.cedula_est
SET m.curso_id = @curso_bach1_id,
    m.paralelo_id = @paralelo_default_id,
    m.especialidad_id = CASE WHEN t.especialidad_codigo = 'DGR' THEN @esp_dgr_id ELSE @esp_dsw_id END,
    m.estado = 'MATRICULADO'
WHERE m.periodo_id = @periodo_activo_id;

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
