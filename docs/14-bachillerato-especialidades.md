# Bachillerato y especialidades

Fecha: 2026-06-08

## Objetivo

Agregar soporte inicial para `1ro Bachillerato` con especialidades:

- Desarrollo de Software
- Diseño Gráfico

Cada especialidad puede tener su propio grupo de estudiantes, materias y
asignaciones docentes.

## Base de datos

Script:

- `database/seed-bachillerato-especialidades.sql`

El script:

- Crea la tabla `especialidades` si no existe.
- Agrega `especialidad_id` a `matriculas` si no existe.
- Agrega `especialidad_id` a `asignaciones_docente` si no existe.
- Crea indices para consultas por especialidad.
- Crea o reactiva `1ro Bachillerato`.
- Crea las especialidades `Desarrollo de Software` y `Diseño Gráfico`.
- Agrega las materias `PROGRAMACION ESTRUCTURADA` y `BASE DE DATOS`.
- Crea estudiantes iniciales con cedulas temporales controladas.
- Matricula esos estudiantes en el periodo activo y los separa por especialidad.

## Rutas ajustadas

### Matriculas

Archivo:

- `backend/src/routes/enrollments.routes.js`

Cambios:

- `GET /api/enrollments/especialidades?curso_id=`
- `GET /api/enrollments` devuelve `especialidad_id` y `especialidad` cuando existe la columna.
- `POST /api/enrollments`
- `POST /api/enrollments/asignar-manual`
- `POST /api/enrollments/distribuir`

Las rutas son compatibles: si la base todavia no tiene `especialidad_id`, siguen
trabajando como antes.

### Admin cursos/asignaciones

Archivo:

- `backend/src/routes/admin.routes.js`

Cambios:

- `GET /api/admin/asignaciones-docente` puede listar especialidad.
- `POST /api/admin/asignaciones-docente` puede recibir `especialidad_id`.
- El catalogo oficial incluye `PROGRAMACION ESTRUCTURADA` y `BASE DE DATOS`.

### Profesor / Academico

Archivos:

- `backend/src/routes/profesor.routes.js`
- `backend/src/routes/academico.routes.js`

Cambios:

- El profesor ve la especialidad en sus materias asignadas.
- Si una asignacion docente tiene `especialidad_id`, el listado de alumnos se
  filtra por esa especialidad.
- El guardado de notas valida que la matricula pertenezca a la asignacion y, si
  aplica, a la misma especialidad.

## Frontend

Archivos:

- `frontend/app.html`
- `frontend/assets/app.js`
- `frontend/assets/js/view-cursos.js`
- `frontend/assets/js/profesor-academico.js`

Cambios:

- En Matriculas / Distribucion aparece selector de especialidad cuando el curso
  tiene especialidades.
- En Ver Matriculados y Distribucion se muestra la especialidad del estudiante.
- En Cursos/Admin, al asignar materia a profesor, se puede elegir especialidad.
- En Portal Profesor se muestra la especialidad en tarjetas y cabecera de materia.

## Reglas

- Inicial y Basica pueden seguir sin especialidad.
- Bachillerato usa especialidad como capa adicional sobre curso, paralelo y periodo.
- El Admin puede ver y modificar todas las asignaciones.
- El Profesor solo ve y gestiona sus asignaciones activas.
- La seguridad no depende del frontend: el backend filtra por asignacion y
  especialidad cuando corresponde.

## Pruebas sugeridas

Admin:

1. Ejecutar `database/seed-bachillerato-especialidades.sql` en Railway.
2. Entrar a `Matriculas`.
3. Confirmar que aparece `1ro Bachillerato`.
4. Entrar en `Distribucion`.
5. Confirmar que aparecen especialidades.
6. Filtrar `Diseño Gráfico` y verificar sus 16 estudiantes.
7. Filtrar `Desarrollo de Software` y verificar sus 17 estudiantes.
8. Entrar a `Materias` y confirmar `PROGRAMACION ESTRUCTURADA` y `BASE DE DATOS`.
9. Entrar a `Cursos` y asignar una materia/profesor a una especialidad.

Profesor:

1. Iniciar sesion con el profesor asignado.
2. Entrar al Portal Profesor.
3. Confirmar que aparece solo la materia asignada.
4. Confirmar que se muestra la especialidad.
5. Entrar a la materia y verificar que solo salen estudiantes de esa especialidad.

## Bitacora

- 2026-06-08: se crea documentacion inicial de Bachillerato, especialidades,
  estudiantes iniciales y proteccion academica por especialidad.
