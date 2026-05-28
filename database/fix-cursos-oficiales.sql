-- Correccion visual/oficial de nombres de cursos.
-- Ejecutar en Railway MySQL cuando se confirme que los ids coinciden con la tabla cursos.

UPDATE cursos SET nombre = 'Primero de Basica' WHERE codigo IN ('1BAS', '1RO', '1ERO') OR UPPER(nombre) IN ('1RO DE BASICA', 'PRIMERO EGB', '1RO EGB');
UPDATE cursos SET nombre = 'Segundo de Basica' WHERE codigo IN ('2BAS', '2DO') OR UPPER(nombre) IN ('2DO DE BASICA', 'SEGUNDO EGB', '2DO EGB');
UPDATE cursos SET nombre = 'Tercero de Basica' WHERE codigo IN ('3BAS', '3RO') OR UPPER(nombre) IN ('3RO DE BASICA', 'TERCERO EGB', '3RO EGB');
UPDATE cursos SET nombre = 'Cuarto de Basica' WHERE codigo IN ('4BAS', '4TO', '4RO') OR UPPER(nombre) IN ('4RO', '4RO DE BASICA', '4TO DE BASICA', 'CUARTO EGB', '4TO EGB');
UPDATE cursos SET nombre = 'Quinto de Basica' WHERE codigo IN ('5BAS', '5TO') OR UPPER(nombre) IN ('5TO DE BASICA', 'QUINTO EGB', '5TO EGB');
UPDATE cursos SET nombre = 'Sexto de Basica' WHERE codigo IN ('6BAS', '6TO') OR UPPER(nombre) IN ('6TO DE BASICA', 'SEXTO EGB', '6TO EGB');
UPDATE cursos SET nombre = 'Septimo de Basica' WHERE codigo IN ('7BAS', '7MO') OR UPPER(nombre) IN ('7MO DE BASICA', 'SEPTIMO EGB', '7MO EGB');
