-- Catalogo oficial de materias MFC
-- Fecha: 2026-05-26
--
-- Objetivo:
-- 1. Crear o reactivar las materias oficiales que se usaran por ahora.
-- 2. No eliminar materias antiguas automaticamente.
-- 3. Evitar duplicados por codigo o por nombre.
--
-- Ejecutar en Railway / MySQL sobre la base de datos de produccion.

START TRANSACTION;

CREATE TEMPORARY TABLE tmp_materias_oficiales (
  codigo VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL
);

INSERT INTO tmp_materias_oficiales (codigo, nombre) VALUES
  ('CEL', 'Comprensión y Expresión del Lenguaje'),
  ('RLM', 'Relación Lógico Matemático'),
  ('RLG', 'Relaciones Lógicas Matemáticas'),
  ('IAU', 'Identidad y autonomía'),
  ('RMN', 'Relación con el medio natural y cultural'),
  ('RMC', 'Relaciones con el medio natural y cultural'),
  ('ING', 'Inglés'),
  ('CON', 'Convivencia'),
  ('ECA', 'Educación Cultural y Artística'),
  ('EAR', 'Expresión Artística'),
  ('EFI', 'Educación Física'),
  ('LEN', 'Lengua y Literatura'),
  ('MAT', 'Matemáticas'),
  ('CNT', 'Ciencias Naturales'),
  ('SOC', 'Estudios Sociales'),
  ('ACO', 'Acompañamiento'),
  ('ALE', 'Animación a la lectura'),
  ('FCR', 'Formación Cristiana'),
  ('COM', 'Computación'),
  ('CIV', 'Cívica'),
  ('ECO', 'Expresión Corporal'),
  ('LEX', 'Lengua Extranjera'),
  ('ECF', 'Educación Cultural y Física'),
  ('FCV', 'Formación Cristiana y Valores');

-- Si ya existe el codigo, se actualiza el nombre y se reactiva.
UPDATE materias m
JOIN tmp_materias_oficiales t ON t.codigo = m.codigo
SET
  m.nombre = t.nombre,
  m.estado = 'ACTIVO',
  m.updated_at = CURRENT_TIMESTAMP;

-- Si ya existe el nombre con otro codigo, se reactiva sin cambiar el codigo actual.
UPDATE materias m
JOIN tmp_materias_oficiales t
  ON LOWER(TRIM(t.nombre)) = LOWER(TRIM(m.nombre))
SET
  m.estado = 'ACTIVO',
  m.updated_at = CURRENT_TIMESTAMP;

-- Inserta solo las materias que no existen ni por codigo ni por nombre.
INSERT INTO materias (codigo, nombre, estado, created_at, updated_at)
SELECT
  t.codigo,
  t.nombre,
  'ACTIVO',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM tmp_materias_oficiales t
WHERE NOT EXISTS (
  SELECT 1
  FROM materias m
  WHERE m.codigo = t.codigo
     OR LOWER(TRIM(m.nombre)) = LOWER(TRIM(t.nombre))
);

-- Revision posterior recomendada:
-- Ver materias activas que no pertenecen al catalogo oficial.
-- No inactivar hasta confirmar que no tienen asignaciones ni calificaciones.
SELECT m.id, m.codigo, m.nombre, m.estado
FROM materias m
LEFT JOIN tmp_materias_oficiales t
  ON t.codigo = m.codigo
  OR LOWER(TRIM(t.nombre)) = LOWER(TRIM(m.nombre))
WHERE t.codigo IS NULL
ORDER BY m.nombre;

COMMIT;

