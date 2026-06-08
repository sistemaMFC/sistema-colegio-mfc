-- Catalogo oficial de materias MFC
-- Fecha: 2026-05-26
--
-- Objetivo:
-- 1. Crear o reactivar las materias oficiales que se usaran por ahora.
-- 2. No eliminar materias antiguas automaticamente.
-- 3. Evitar duplicados por codigo o por nombre.
-- 4. Guardar los nombres en MAYUSCULAS para mantener un catalogo uniforme.
--
-- Ejecutar en Railway / MySQL sobre la base de datos de produccion.

START TRANSACTION;

CREATE TEMPORARY TABLE tmp_materias_oficiales (
  codigo VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL
);

INSERT INTO tmp_materias_oficiales (codigo, nombre) VALUES
  ('CEL', 'COMPRENSIÓN Y EXPRESIÓN DEL LENGUAJE'),
  ('RLM', 'RELACIÓN LÓGICO MATEMÁTICO'),
  ('RLG', 'RELACIONES LÓGICAS MATEMÁTICAS'),
  ('IAU', 'IDENTIDAD Y AUTONOMÍA'),
  ('RMN', 'RELACIÓN CON EL MEDIO NATURAL Y CULTURAL'),
  ('RMC', 'RELACIONES CON EL MEDIO NATURAL Y CULTURAL'),
  ('ING', 'INGLÉS'),
  ('CON', 'CONVIVENCIA'),
  ('ECA', 'EDUCACIÓN CULTURAL Y ARTÍSTICA'),
  ('EAR', 'EXPRESIÓN ARTÍSTICA'),
  ('EFI', 'EDUCACIÓN FÍSICA'),
  ('LEN', 'LENGUA Y LITERATURA'),
  ('MAT', 'MATEMÁTICAS'),
  ('CNT', 'CIENCIAS NATURALES'),
  ('SOC', 'ESTUDIOS SOCIALES'),
  ('ACO', 'ACOMPAÑAMIENTO'),
  ('ALE', 'ANIMACIÓN A LA LECTURA'),
  ('FCR', 'FORMACIÓN CRISTIANA'),
  ('COM', 'COMPUTACIÓN'),
  ('CIV', 'CÍVICA'),
  ('ECO', 'EXPRESIÓN CORPORAL'),
  ('LEX', 'LENGUA EXTRANJERA'),
  ('ECF', 'EDUCACIÓN CULTURAL Y FÍSICA'),
  ('FCV', 'FORMACIÓN CRISTIANA Y VALORES'),
  ('PGE', 'PROGRAMACIÓN ESTRUCTURADA'),
  ('BDD', 'BASE DE DATOS');

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
