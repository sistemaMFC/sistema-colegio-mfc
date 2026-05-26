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
- Materias
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

## Imagen de marca y responsividad

Logo oficial usado:

- `frontend/LOGO.jpeg`

Uso actual:

- Favicon de la pestana en `frontend/index.html`, `frontend/app.html` y `frontend/profesor-academico.html`.
- Logo visible en el login.
- Logo visible en la barra superior del panel administrativo.
- Logo visible en la barra superior del portal profesor.
- Logo visible en el menu lateral administrativo.
- Logo usado en certificados/reportes desde `frontend/assets/js/reportes-mfc.js`.

Archivos de estilos:

- `frontend/styles.css`: estilos del login y su vista movil.
- `frontend/assets/app.css`: estilos compartidos del panel administrativo y portal profesor.
- `frontend/pagos/pagos.css`: ajustes propios del modulo de pagos.

Regla:

- La responsividad debe resolverse principalmente con CSS.
- No crear una version separada de la pagina para movil.
- Las tablas pueden usar desplazamiento horizontal en pantallas pequenas.
- Los formularios deben pasar a una sola columna en celular.
- El menu lateral administrativo debe comportarse como panel deslizable en celular.

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

Catalogo oficial de materias por ahora:

- COMPRENSIÓN Y EXPRESIÓN DEL LENGUAJE
- RELACIÓN LÓGICO MATEMÁTICO
- RELACIONES LÓGICAS MATEMÁTICAS
- IDENTIDAD Y AUTONOMÍA
- RELACIÓN CON EL MEDIO NATURAL Y CULTURAL
- RELACIONES CON EL MEDIO NATURAL Y CULTURAL
- INGLÉS
- CONVIVENCIA
- EDUCACIÓN CULTURAL Y ARTÍSTICA
- EXPRESIÓN ARTÍSTICA
- EDUCACIÓN FÍSICA
- LENGUA Y LITERATURA
- MATEMÁTICAS
- CIENCIAS NATURALES
- ESTUDIOS SOCIALES
- ACOMPAÑAMIENTO
- ANIMACIÓN A LA LECTURA
- FORMACIÓN CRISTIANA
- COMPUTACIÓN
- CÍVICA
- EXPRESIÓN CORPORAL
- LENGUA EXTRANJERA
- EDUCACIÓN CULTURAL Y FÍSICA
- FORMACIÓN CRISTIANA Y VALORES

Script de carga:

- `database/seed-materias-oficiales.sql`

Pantalla administrativa:

- Menu `Materias` en `frontend/app.html`.
- Logica de la pantalla en `frontend/assets/app.js`.
- Rutas backend en `backend/src/routes/admin.routes.js`.

Reglas:

- Solo `ADMIN` puede crear, editar, cargar listado oficial o quitar materias.
- Las materias se guardan en MAYUSCULAS.
- El backend valida duplicados por `codigo` y por `nombre`, ignorando diferencias de tildes y espacios.
- Quitar una materia intenta eliminarla; si tiene historial, se marca como `INACTIVO`.
- Academico y profesor solo deben consumir materias con `estado = 'ACTIVO'`.

Procedimiento:

1. Subir primero este catalogo a la tabla `materias`.
2. Revisar que materias antiguas quedan activas fuera del catalogo.
3. No borrar ni inactivar materias antiguas hasta confirmar que no tienen asignaciones ni calificaciones.
4. Despues de cerrar el catalogo, crear o actualizar `asignaciones_docente` usando estas materias.
5. Recién despues ajustar pantallas si se necesita filtrar por nivel, curso o seccion.

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
10. `LOGO.jpeg` se usa como favicon y como imagen de marca en login, admin, profesor y reportes.
11. Se mejoro la responsividad movil de login, panel administrativo, portal profesor y modulo de pagos.
12. Se definio el catalogo oficial inicial de materias en MAYUSCULAS y se creo `database/seed-materias-oficiales.sql` para cargarlo en MySQL.
13. Se creo la seccion administrativa `Materias` para crear, editar, cargar el listado oficial y quitar/inactivar materias.

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
