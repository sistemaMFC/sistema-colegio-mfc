# Funcionamiento del sistema MFC

Fecha de decision: 2026-05-26

Este documento deja definido que partes del sistema se usan como fuente oficial,
que partes quedan como legado y cual es el procedimiento para continuar sin
mezclar tablas antiguas con tablas nuevas.

## Objetivo

El sistema debe trabajar con un flujo unico:

1. Un usuario inicia sesion.
2. Segun su rol entra al panel administrativo o al portal profesor.
3. Los estudiantes se registran en `estudiantes`.
4. La matricula oficial se registra en `matriculas`.
5. Las materias por docente se toman de `asignaciones_docente`.
6. Las notas se guardan en `calificaciones`.
7. Los reportes se calculan desde `calificaciones` y, cuando aplique, desde vistas como `vw_promedios_trimestrales`.

## Paginas principales

### Login

Archivo principal:

- `frontend/index.html`
- `frontend/app.js`

Funcionamiento:

- Envia cedula y contrasena a `POST /auth/login`.
- Guarda `mfc_token` y `mfc_user` en `localStorage`.
- Si el rol es `PROFESOR`, redirige a `profesor-academico.html`.
- Si el rol es `ADMIN`, `SECRETARIA` o `COLECTOR`, redirige a `app.html`.
- Cualquier usuario autenticado puede consultar y editar su perfil con `GET /auth/me` y `PUT /auth/me`.
- Cualquier usuario autenticado puede cambiar su propia contrasena con `PUT /auth/me/password`.

### Panel administrativo

Archivo principal:

- `frontend/app.html`
- `frontend/assets/app.js`

Modulos actuales:

- Dashboard
- Estudiantes
- Matriculas
- Academico
- Pagos
- Usuarios

Este panel queda como vista completa para administracion y secretaria.

Regla de administracion:

- El rol `ADMIN` tiene acceso total al sistema.
- Un administrador puede ver, crear, editar y eliminar usuarios.
- Si un usuario tiene historial vinculado y no se puede borrar fisicamente, el sistema lo marca como `INACTIVO`.
- Un administrador no puede eliminar su propio usuario desde el panel para evitar bloquearse a si mismo.

### Portal profesor

Archivos:

- `frontend/profesor-academico.html`
- `frontend/assets/js/profesor-academico.js`

Funcionamiento:

- Requiere token JWT.
- Carga perfil con `GET /api/profesor/perfil`.
- Carga docente y materias asignadas con `GET /api/profesor/mi-docente`.
- Carga trimestres con `GET /api/academico/trimestres`.
- Carga alumnos y notas con `GET /api/academico/notas`.
- Guarda notas con `POST /api/academico/notas`.
- Permite editar perfil propio y cambiar contrasena.

Regla importante:

- Un profesor solo debe ver y editar sus propias asignaciones.
- El backend ya valida esta regla en `backend/src/routes/academico.routes.js`.

## Tablas oficiales

### Usuarios y roles

Usar:

- `usuarios`

Uso:

- Login.
- Roles: `ADMIN`, `SECRETARIA`, `COLECTOR`, `PROFESOR`.
- Estado de usuario: `ACTIVO` o `INACTIVO`.

No duplicar usuarios en otra tabla.

Reglas de perfiles:

- Todo usuario puede editar sus propios nombres, apellidos y cedula.
- Todo usuario puede cambiar su propia contrasena si conoce la contrasena actual.
- Solo `ADMIN` puede crear usuarios.
- Solo `ADMIN` puede editar rol, estado o resetear contrasena de otro usuario.
- Solo `ADMIN` puede eliminar usuarios.
- `ADMIN` es un rol superior: puede ver y modificar todo, incluso informacion academica.
- Si una persona debe ser administradora y tambien docente, la cuenta puede ser `ADMIN` para acceso total; si se necesita que aparezca como docente en asignaciones, tambien debe existir el registro correspondiente en `docentes`.

### Docentes

Usar:

- `docentes`

Uso:

- Vincular un usuario profesor con un docente.
- El portal profesor depende de esta relacion.

Regla:

- Todo usuario con rol `PROFESOR` que deba ingresar notas necesita un registro activo en `docentes`.

### Estudiantes

Usar:

- `estudiantes`

Uso:

- Datos personales del alumno.
- Datos del representante.
- Informacion general de contacto.

Regla:

- `estudiantes` no debe decidir por si sola si el alumno esta matriculado en un periodo.
- La matricula oficial debe vivir en `matriculas`.

### Matriculas

Usar:

- `matriculas`

Uso:

- Relacionar estudiante, periodo, curso y paralelo.
- Determinar que alumnos aparecen en academico.
- Relacionar pagos y cargos con un periodo real.

Estados aceptados por academico:

- `ACTIVO`
- `MATRICULADO`

Decision:

- El sistema debe avanzar hacia `MATRICULADO` como estado oficial de matricula.
- `ACTIVO` se acepta por compatibilidad con datos existentes.

### Catalogos academicos

Usar:

- `periodos_lectivos`
- `cursos`
- `paralelos`
- `materias`
- `trimestres`
- `tipos_evaluacion`

Uso:

- `periodos_lectivos`: periodo activo.
- `cursos`: niveles/curso.
- `paralelos`: paralelos disponibles.
- `materias`: materias oficiales.
- `trimestres`: trimestre 1, 2 y 3.
- `tipos_evaluacion`: actividades, examen y demas tipos de nota.

Nota:

- `trimestres` ya tiene campos de bloqueo. Mas adelante se puede usar `bloqueado` para cerrar ingreso de notas.

### Asignaciones docentes

Usar como oficial:

- `asignaciones_docente`

Uso:

- Define que docente da que materia, en que curso, paralelo y periodo.
- Es la base del portal profesor.
- Es la base de las notas en `calificaciones`.

Estructura esperada por el backend:

- `docente_id`
- `materia_id`
- `curso_id`
- `paralelo_id`
- `periodo_id`
- `estado`

Tabla que no se usara por ahora:

- `asignacion_materias`

Motivo:

- Parece una tabla antigua o duplicada.
- Si contiene datos utiles, se deben migrar a `asignaciones_docente` antes de eliminarla.

### Calificaciones

Usar como oficial:

- `calificaciones`

Uso:

- Guardar notas por matricula, asignacion, trimestre y tipo de evaluacion.

Campos clave:

- `matricula_id`
- `asignacion_id`
- `trimestre_id`
- `tipo_evaluacion_id`
- `nota`
- `observacion`

Regla:

- Cada combinacion `matricula_id + asignacion_id + trimestre_id + tipo_evaluacion_id` debe ser unica.
- Si no existe un indice unico, el `ON DUPLICATE KEY UPDATE` no funcionara como se espera.

Tabla que no se usara por ahora:

- `notas`

Motivo:

- Tiene estructura antigua: `estudiante_id`, `materia_id`, `trimestre`, `nota_proceso`, `nota_examen`.
- No se relaciona bien con matricula, asignacion docente ni tipos de evaluacion.
- Puede quedar solo para consulta historica o migracion.

### Reportes

Usar:

- `calificaciones`
- `vw_promedios_trimestrales` cuando este alineada con `calificaciones`

Uso:

- Reporte individual.
- Resumen por curso.
- Promedios trimestrales y anuales.

## Pagos

Estado actual:

- El codigo actual mezcla dos modelos:
  - cargos por `estudiante_id`
  - cargos por `matricula_id`

Decision por ahora:

- No seguir ampliando pagos hasta revisar bien estas tablas:
  - `cargos_estudiante`
  - `conceptos_cobro`
  - `pagos_abonos`
  - `pagos_pension`
  - `pensiones_config`
  - `pensiones_meses`

Decision probable:

- Usar `cargos_estudiante` como deuda oficial por matricula.
- Usar `conceptos_cobro` como catalogo de conceptos.
- Revisar si `pagos_abonos` y `pagos_pension` reemplazan o complementan la tabla `pagos` que el codigo actual intenta usar.

Regla:

- Los pagos deben depender de una matricula, no solo del estudiante.
- Asi se evita mezclar deudas de distintos periodos.

## Tablas no necesarias por ahora

No borrar aun. Solo no usarlas en nuevo codigo hasta revisar datos.

- `notas`
- `asignacion_materias`
- `tutores_curso`
- tablas de pagos duplicadas hasta decidir modelo final

Motivo:

- Pueden tener datos viejos o pruebas.
- Primero hay que migrar o confirmar que estan vacias.

## Cambios realizados en esta etapa

1. El login ahora redirige segun rol.
2. Se creo el portal profesor real.
3. El portal profesor usa `calificaciones`, no `notas`.
4. El backend valida que el profesor solo acceda a sus asignaciones.
5. Academico acepta matriculas con estado `ACTIVO` o `MATRICULADO`.
6. `/api/enrollments` lista estudiantes usando columnas reales: `apellidos_est`, `nombres_est`, `cedula_est`.
7. El formulario de usuarios permite crear `PROFESOR`.
8. Cada usuario puede editar su perfil y cambiar su propia contrasena.
9. El administrador puede editar usuarios, cambiar roles, resetear contrasenas y eliminar/inactivar usuarios.

## Procedimiento para continuar

### Paso 1: cerrar modelo academico

Confirmar que estas tablas tienen datos correctos:

- `docentes`
- `asignaciones_docente`
- `matriculas`
- `calificaciones`
- `tipos_evaluacion`
- `trimestres`

Luego probar:

- Login como profesor.
- Carga de materias.
- Carga de alumnos por asignacion.
- Guardado de notas.
- Reporte de notas.

### Paso 2: cerrar modelo de matriculas

Hacer que todo registro de alumno pase por:

1. Crear/actualizar `estudiantes`.
2. Crear `matriculas`.
3. Generar cargos iniciales, si corresponde.

No depender solo de `estudiantes.estado`.

### Paso 3: cerrar modelo de pagos

Elegir una sola ruta:

- Cargos por `matricula_id`.
- Pagos/abonos relacionados a cargos.
- Reporte financiero por periodo.

### Paso 4: limpieza

Cuando todo este probado:

- Marcar tablas antiguas como legado.
- Migrar datos utiles.
- Recien despues considerar eliminar tablas.

## Resumen de decision

El sistema nuevo debe usar:

- `usuarios`
- `docentes`
- `estudiantes`
- `matriculas`
- `periodos_lectivos`
- `cursos`
- `paralelos`
- `materias`
- `trimestres`
- `tipos_evaluacion`
- `asignaciones_docente`
- `calificaciones`

El sistema no debe usar para desarrollo nuevo:

- `notas`
- `asignacion_materias`
- `tutores_curso`

Pagos queda pendiente de cierre final porque aun hay tablas duplicadas o modelos mezclados.
