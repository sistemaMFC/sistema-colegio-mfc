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
- Cursos
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
- Permite cargar foto de perfil local para mostrarla en la barra superior y modal de perfil.
- Si el profesor es tutor, carga sus cursos con `GET /api/profesor/tutor-estudiantes`.

Regla importante:

- Un profesor solo debe ver y editar sus propias asignaciones.
- El backend ya valida esta regla en `backend/src/routes/academico.routes.js`.
- Un profesor solo ve estudiantes completos de los cursos donde esta registrado como tutor activo.

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
- El panel administrativo y el portal profesor soportan modo claro y modo oscuro usando `mfc_theme` en `localStorage`.
- Los modales del sistema deben mostrar acciones visibles de `Retroceder` y `Cerrar`.

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

### Habilitacion de cursos

Pantalla administrativa:

- Menu `Cursos` en `frontend/app.html`.
- Logica en `frontend/assets/app.js`.
- Rutas backend en `backend/src/routes/admin.routes.js`.

Uso:

- El administrador habilita o deshabilita cursos desde la tabla `cursos`.
- Solo los cursos con `estado = 'ACTIVO'` aparecen para asignar materias, matriculas y academico.
- Si un curso se deshabilita, sus asignaciones en `asignaciones_docente` quedan `INACTIVO`.
- El administrador asigna materia, paralelo y profesor para el periodo lectivo activo.
- Los profesores se toman desde la lista de `usuarios` con rol `PROFESOR` o `ADMIN`.
- Si el usuario seleccionado no existe todavia en `docentes`, el backend crea o reactiva ese registro automaticamente.

Regla:

- El portal profesor no necesita una tabla aparte.
- Todo lo que el admin habilite en `asignaciones_docente` con estado `ACTIVO` aparece en el portal del profesor.
- La pantalla de `Cursos` debe cargar cursos, materias, paralelos y profesores aunque la lista de asignaciones tenga un problema temporal.
- La ruta `GET /api/admin/asignaciones-docente` inspecciona columnas reales de Railway para evitar errores por diferencias menores de estructura.
- `asignaciones_docente` puede usar `docente_id` o `profesor_id` segun la estructura real de la base. El backend detecta la columna y usa la que exista.
- Para que una materia aparezca al profesor debe cumplirse:
  - curso activo,
  - materia activa,
  - paralelo activo,
  - periodo activo,
  - docente activo,
  - asignacion docente activa.

### Tutorias

Usar:

- `tutorias`

Uso:

- Asignar opcionalmente un profesor tutor a un curso/paralelo/periodo.
- Permitir que el profesor tutor vea la lista completa de estudiantes de sus cursos.

Reglas:

- La tutoria no es obligatoria.
- Un curso puede no tener tutor.
- Un profesor puede ser tutor de un curso, varios cursos o ninguno.
- El administrador asigna o quita tutores desde la seccion `Cursos`.
- El tutor se selecciona desde usuarios activos con rol `PROFESOR` o `ADMIN`.
- Para el periodo activo solo debe haber una tutoria activa por curso/paralelo.
- Las tutorias se conectan con lista por curso, asistencia y notas.

### Asistencia por tutor

Pendiente de implementar:

- Crear lista diaria de asistencia por curso/paralelo.
- Solo el profesor tutor del curso puede tomar asistencia de sus estudiantes.
- El administrador conserva acceso total para consultar, corregir o auditar.

Tablas propuestas:

- `asistencias`
- `asistencia_detalle`

Flujo:

1. Administrador asigna tutor al curso/paralelo.
2. Tutor entra a su portal.
3. El sistema muestra los cursos donde es tutor.
4. Tutor abre la lista de asistencia del dia.
5. Marca presente, ausente, atraso o justificado por estudiante.

### Matriculas y asignacion manual

Decision:

- Los alumnos no deben enviarse automaticamente a un curso/paralelo.
- La matricula oficial debe permitir escoger manualmente curso y paralelo.
- Ejemplo: `Inicial 2 A` e `Inicial 2 B` deben recibir estudiantes de forma manual.

Regla:

- La relacion oficial estudiante-curso-paralelo-periodo vive en `matriculas`.
- `estudiantes.curso_id` queda como dato auxiliar o legado, no como fuente principal del curso oficial.
- La asignacion manual se hace con `POST /api/enrollments/asignar-manual`.
- Si el estudiante no tiene matricula en el periodo activo, el endpoint la crea.
- Si el estudiante ya tiene matricula en el periodo activo, el endpoint lo mueve al nuevo curso/paralelo.
- `Pre-Matriculados` no se usa para distribuir estudiantes; queda reservado para promocion futura al siguiente año lectivo.
- La pantalla `Matriculas` incluye la opcion `Distribucion` para mover estudiantes ya matriculados entre paralelos.
- La distribucion en bloque se hace con `POST /api/enrollments/distribuir`.
- En `Distribucion`, el administrador selecciona estudiantes con checkbox, escoge el paralelo destino y mueve solo los seleccionados.
- El listado real del profesor se alimenta desde `matriculas`, por eso solo aparecen los alumnos del paralelo asignado.

### Nuevo modelo de notas

El modelo actual con `calificaciones` queda como base temporal y legado.
El modelo nuevo usa tablas separadas para parciales, insumos, notas por insumo
y examen trimestral.

Modelo academico requerido:

- Trimestre.
- Parciales dinamicos creados por el profesor o administrador.
- Insumos por parcial:
  - Tareas.
  - Lecciones.
  - Individual.
  - Talleres.
  - Aportes.
- Examen separado del parcial.
- Comportamiento separado de notas academicas.

Reglas:

- Los parciales no son fijos.
- El profesor puede crear la cantidad de parciales que necesite.
- Cada parcial tiene sus propios insumos.
- Los insumos del parcial se promedian y generan una nota unica del parcial.
- El promedio de parciales representa el 70%.
- El examen representa el porcentaje restante definido por la institucion.
- El examen no se mezcla con tareas, lecciones, talleres, aportes ni individual.
- El examen es unico por estudiante, asignacion y trimestre, aunque existan varios parciales.
- El administrador puede entrar a cualquier curso, paralelo, materia y profesor.
- El profesor solo entra a sus asignaciones activas.

Tablas propuestas:

- `parciales`
- `insumos`
- `calificaciones_insumos`
- `calificaciones_examenes`
- `calificaciones_comportamiento`

Tablas implementadas:

- `academico_parciales`
- `academico_insumos`
- `academico_notas_insumos`
- `academico_examenes_trimestrales`

Script de instalacion:

- `database/academico-parciales-insumos.sql`

Colores oficiales de insumos:

- Tareas: azul.
- Lecciones: naranja.
- Talleres: verde.
- Aportes: morado.
- Individual: celeste.

Nota unica:

- Debe existir nota unica por parcial.
- Debe existir nota unica por examen.
- Debe existir nota unica por insumo.
- Si el docente coloca nota unica `10` en un parcial, el sistema replica ese valor en tareas, lecciones, aportes, talleres e individual.
- El docente puede editar despues cualquier casillero individual.

Comportamiento:

- 9 y 10: `A`.
- 7 y 8: `B`.
- 5 y 6: `C`.
- Menor a 5: `D`.

Alumnos no matriculados y oyentes:

- Queda planificada una seccion para alumnos no matriculados y alumnos oyentes.
- Sus notas deben guardarse relacionadas a curso/paralelo aunque aun no exista matricula oficial.
- Esta funcion no debe mezclarse todavia con `matriculas` hasta crear el modelo correcto.

### Cursos oficiales

Los nombres deben mostrarse de forma profesional:

- Primero de Basica.
- Segundo de Basica.
- Tercero de Basica.
- Cuarto de Basica.
- Quinto de Basica.
- Sexto de Basica.
- Septimo de Basica.

Correccion:

- No usar nombres como `4RO`.
- Se creo `database/fix-cursos-oficiales.sql` para normalizar nombres de cursos en MySQL.

### Certificados

Correccion visual:

- El logotipo no debe montarse encima del nombre de la institucion.
- El logotipo se ubica en la zona superior derecha.
- La foto carnet baja un poco para no superponerse.
- El certificado debe mantener una composicion limpia, profesional y sin elementos cruzados.

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
- Se administra desde la seccion `Cursos`.

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
14. Se creo la seccion administrativa `Cursos` para habilitar cursos y asignar materias con profesor por curso/paralelo/periodo.
15. Se hizo mas resistente la carga de `Cursos`: si falla el listado de asignaciones, no bloquea la carga de cursos, materias, paralelos y profesores.
16. Se adapto `asignaciones_docente` para soportar bases que usan `profesor_id` en lugar de `docente_id`.
17. Se agrego asignacion opcional de profesor tutor por curso/paralelo/periodo.
18. Se agrego `GET /api/profesor/tutor-estudiantes` para que el tutor vea sus estudiantes.
19. Se agrego acceso directo `Profesor` para administradores sin quitar permisos administrativos.
20. Se agrego modo claro/oscuro real para panel administrativo y portal profesor.
21. Se redisenaron estilos de matriculas para una interfaz mas clara, limpia y responsive.
22. Se agrego foto de perfil local para usuarios y profesores.
23. Se documento el nuevo modelo requerido de notas por parciales dinamicos, insumos, examen separado, nota unica y comportamiento.
24. Se creo `database/fix-cursos-oficiales.sql` para corregir nombres profesionales de cursos.
25. Se ajusto el certificado para separar el logotipo de la cabecera institucional y bajar la foto carnet.
26. Se redisenó el portal profesor con pestañas de `Notas` y `Tutorías`, resumen académico, colores por insumo y botones de nota única.
27. Se corrigió la carga de estudiantes por tutor usando `celular_rep` como teléfono del representante.
28. Se agregó una primera lista de asistencia local en el portal profesor para tutores; falta persistirla en tablas oficiales de asistencia.
29. Se agrego asignacion manual oficial de estudiantes a curso/paralelo con `POST /api/enrollments/asignar-manual`.
30. La pantalla de matriculas ahora incluye `Distribucion`, separada de `Pre-Matriculados`, para mover estudiantes entre paralelos usando `matriculas` como fuente real.
31. Se agrego `POST /api/enrollments/distribuir` para mover en bloque matriculas seleccionadas a paralelo A, B, C o D.
32. 2026-06-08: Se agrego la seccion **Ver insumos** en Profesor y Admin para listar insumos creados (tareas, actividad individual, actividad grupal, leccion y prueba) y se habilito eliminacion segura de insumos con confirmacion.
33. 2026-06-08: Se implemento `DELETE /api/academico/insumos/:id` con validacion de permisos por asignacion, bloqueo si el parcial esta cerrado (excepto admin), y borrado de notas hijas antes de eliminar el insumo.
32. Fecha: 2026-06-01 — Portal profesor: se agregó botón `Volver a Admin` visible solo para usuarios con rol `ADMIN`, con redirección a `app.html`. Para rol `PROFESOR` el botón permanece oculto.
32. Fecha 2026-05-31: Se corrigio `POST /api/students` para quitar el periodo hardcodeado (`2026-2027`), permitir alta sin curso obligatorio y reforzar validaciones (cedula de estudiante, cedula de representante y fecha de nacimiento no futura).
33. Fecha 2026-05-31: Se ajusto `frontend/assets/js/view-estudiantes.js` con validaciones de formulario adicionales (cedula representante y fecha no futura) y sanitizacion de datos en el render de tarjetas para reducir riesgo de XSS.
34. Fecha 2026-05-31: Se mantuvo compatibilidad del modulo de estudiantes con el flujo actual, dejando `curso_id` opcional en la creacion para facilitar la transicion al modelo oficial de matriculas por `enrollments`.
32. Fecha 2026-05-30: Se corrigio error en `POST /api/academico/notas` (archivo `backend/src/routes/academico.routes.js`) eliminando la actualizacion de `updated_at` en el UPSERT de `calificaciones`, porque en la base actual existe `created_at` pero no `updated_at`. Con esto se evita el fallo SQL `Unknown column 'updated_at'`.
33. Fecha 2026-05-30: Se agrego base operativa de asistencia para tutores en `backend/src/routes/profesor.routes.js` con `GET /api/profesor/asistencia` y `POST /api/profesor/asistencia` (persistencia por curso/paralelo/fecha). El frontend `frontend/assets/js/profesor-academico.js` dejo de usar solo `localStorage` y ahora intenta guardar asistencia al backend por estudiante.
34. Fecha 2026-05-30: Se reforzo `POST /api/enrollments/distribuir` en `backend/src/routes/enrollments.routes.js` para validar curso/paralelo activos, deduplicar IDs, reportar matriculas movidas y omitidas, y devolver detalle `moved_ids`.

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
- `tutorias`
- `calificaciones`

El sistema no debe usar para desarrollo nuevo:

- `notas`
- `asignacion_materias`
- `tutores_curso`

Pagos queda pendiente de cierre final porque aun hay tablas duplicadas o modelos mezclados.

## Bitacora de cambios recientes

Fecha: 2026-06-09

- Se igualo la estructura visual de `Academico` del administrador con el portal profesor.
- Admin ahora ve pestañas equivalentes:
  - Materias
  - Asistencia
  - Simulacion
  - Documentacion
  - Mensajes
- La pestana `Materias` ahora funciona igual que el portal profesor:
  - primero muestra tarjetas de materias,
  - cada tarjeta tiene `Gestionar materia`,
  - al entrar se abre el libro academico de esa materia,
  - existe boton `Volver a materias`.
- La gestion conserva el libro academico global del administrador.
- El administrador mantiene permisos globales; el profesor sigue limitado a sus asignaciones.
- Archivo principal ajustado: `frontend/assets/js/view-academico.js`.

Fecha: 2026-06-08

- Se agrego soporte inicial para `1ro Bachillerato` con especialidades.
- Nueva tabla propuesta/creada por script: `especialidades`.
- Nuevas columnas opcionales por script:
  - `matriculas.especialidad_id`
  - `asignaciones_docente.especialidad_id`
- Nuevo script: `database/seed-bachillerato-especialidades.sql`.
- Nuevas materias oficiales:
  - `PROGRAMACION ESTRUCTURADA`
  - `BASE DE DATOS`
- En Matriculas/Distribucion se puede filtrar y mover estudiantes por especialidad.
- En Cursos/Admin se puede asignar materia/profesor con especialidad.
- El Portal Profesor muestra especialidad y el backend filtra alumnos por especialidad cuando la asignacion la tiene.
- Documento nuevo: `docs/14-bachillerato-especialidades.md`.

Fecha: 2026-06-08

- Se agrego apartado `Simulacion` en el portal profesor.
- La simulacion usa datos locales ficticios y no modifica MySQL.
- Permite revisar mas de 10 notas por estudiante distribuidas en tareas, lecciones, actividades en clase, actividades grupales y pruebas/aportes.
- El examen trimestral se mantiene separado de los parciales.
- Se agrego libreta simulada imprimible para guardar como PDF desde el navegador.
- Documento nuevo: `docs/13-simulacion-notas-libretas.md`.

Fecha: 2026-06-07

- Se reorganizo el flujo academico del portal profesor para empezar por `Materias`.
- Nueva ruta backend:
  - `GET /api/profesor/materias`
- Flujo nuevo:
  - Profesor entra a Academico.
  - Ve tarjetas de materias asignadas.
  - Selecciona `Gestionar materia`.
  - Recien dentro de esa materia ve insumos, notas por insumo, examen trimestral, promedios y asistencia.
- Toda gestion de insumos/notas/examen usa la `asignacion_id` de la materia seleccionada.
- Se agrego boton `Volver a materias` para salir de la gestion de una materia.
- El backend valida que el profesor solo consulte materias propias; `ADMIN` puede ver todas.
- Se dejo de seleccionar/cargar automaticamente la primera materia para evitar confundir al docente cuando tiene muchas materias.

Fecha: 2026-06-01

- Se implemento la primera version funcional del nuevo modelo academico por:
  - periodo lectivo,
  - trimestre,
  - parciales dinamicos,
  - insumos por parcial,
  - examen trimestral separado.
- Se creo `database/academico-parciales-insumos.sql` con las tablas:
  - `academico_parciales`
  - `academico_insumos`
  - `academico_notas_insumos`
  - `academico_examenes_trimestrales`
- Se agregaron rutas nuevas en `backend/src/routes/academico.routes.js`:
  - `GET /api/academico/libro`
  - `POST /api/academico/parciales`
  - `PATCH /api/academico/parciales/:id/estado`
  - `POST /api/academico/insumos`
  - `POST /api/academico/notas-insumo`
  - `POST /api/academico/examen-trimestral`
  - `POST /api/academico/nota-unica`
- El administrador puede usar la vista academica para cualquier asignacion activa del periodo.
- El portal profesor usa la misma logica academica, pero limitado a sus asignaciones.
- Se ajusto `backend/src/routes/profesor.routes.js` para que ADMIN vea todas las asignaciones y tutorias desde el portal profesor.
- Formula implementada: promedio de parciales 70% + examen trimestral 30%.
- Importante: para activar la persistencia en Railway hay que ejecutar `database/academico-parciales-insumos.sql`.

Fecha: 2026-06-01

- Se pauso temporalmente la vista antigua de Notas/Materias del portal profesor.
- En `frontend/profesor-academico.html` quedan visibles solo estas secciones:
  - Insumos
  - Asistencia
  - Documentacion
  - Mensajes
- En `frontend/assets/js/profesor-academico.js` se dejo de cargar temporalmente:
  - `/api/profesor/mi-docente`
  - `/api/academico/trimestres`
  - `/api/academico/notas`
- La asistencia/tutoria se mantiene desde `GET /api/profesor/tutor-estudiantes`.
- En `frontend/assets/js/view-academico.js` se oculto temporalmente el bloque de Cursos dentro de Academico admin.
- Motivo: evitar que el flujo viejo de calificaciones siga mezclandose con el nuevo modelo que se construira por partes.
- Importante: no se eliminaron rutas ni datos; solo se pauso la interfaz vieja.

Fecha: 2026-06-01

- Se corrigio la estructura de navegacion solicitada:
  - No se agregaron nuevas opciones en el menu principal del administrador.
  - Se mantuvo "Academico" como modulo principal en el sidebar admin.
- Se implemento submenu interno en Academico (admin) con:
  - Insumos / Notas
  - Asistencia
  - Documentacion
- Se implemento el mismo esquema de submenu en el portal profesor:
  - Insumos / Notas
  - Asistencia
  - Documentacion
  - Tutorias
- Objetivo del cambio:
  - Respetar la distribucion funcional pedida, concentrando opciones dentro de Academico y del Portal Profesor, sin contaminar el menu global.

- Fecha: 2026-05-31
- Modulo: Matriculas / Enrollments (`backend/src/routes/enrollments.routes.js`)
- Problema: `GET /api/enrollments` devolvia 500 y en frontend no cargaba "Ver matriculados".
- Causa raiz: el backend consultaba y escribia la columna `fecha_matricula` en `matriculas`, pero el esquema real usa `fecha_registro`.
- Correccion aplicada:
  - En inserciones de matricula (`POST /api/enrollments` y `POST /api/enrollments/asignar-manual`) se cambio a `fecha_registro`.
  - En listado (`GET /api/enrollments`) se cambio a `m.fecha_registro AS fecha_matricula` para mantener compatibilidad con el frontend actual.
  - Se agrego fallback de fecha en backend cuando no se envia `fecha_matricula` desde el cliente.
- Resultado esperado: eliminar el 500 del endpoint y restaurar la carga de estudiantes matriculados en la vista administrativa.

- Fecha: 2026-06-02
- Módulo: Asistencia (Portal Profesor y Académico Admin)
- Cambios aplicados:
  - `frontend/assets/js/profesor-academico.js`:
    - Se rediseñó la sección de asistencia al formato solicitado (filtros superiores + pestañas + tabla tipo nómina).
    - Se incorporaron checkboxes de `Atrasos` e `Inasistencia` por estudiante.
    - Se conectó guardado directo al backend con `POST /api/profesor/asistencia` usando estados `ATRASO`, `AUSENTE` y `PRESENTE`.
  - `frontend/assets/js/view-academico.js`:
    - Se rediseñó la vista de Asistencia del módulo académico admin con la misma estructura visual base de la maqueta.
- Estado:
  - Profesor: funcional para registrar asistencia por estudiante desde la nueva tabla.
  - Admin Académico: UI nueva aplicada; la carga dinámica de nómina por docente/curso/paralelo queda como siguiente fase.

- Fecha: 2026-06-02
- Módulo: Insumos (Portal Profesor)
- Cambios y correcciones documentadas:
  - Archivo: `frontend/assets/js/profesor-academico.js`
  - Se ajustó la UX del botón de parciales para evitar estado vacío inicial:
    - Al cargar libro académico (`loadAcademicBook`) ahora se ejecuta `asegurarParcialesBase()`.
    - Si existen menos de 2 parciales para la asignación/trimestre seleccionados, se crean automáticamente:
      - `PARCIAL 1`
      - `PARCIAL 2`
    - Luego se recarga el libro para reflejar inmediatamente los parciales creados.
  - Se cambió el texto del prompt de creación manual:
    - Antes: "Nombre del parcial:"
    - Ahora: "Nombre del parcial adicional:"
    - Objetivo: dejar claro que el botón es para agregar parciales extra, no para crear los dos base.
- Resultado esperado:
  - Al entrar en Insumos, el docente siempre dispone de al menos dos parciales para trabajar.
  - El botón "Crear parcial" queda reservado para crear parciales adicionales según necesidad.
- Nota técnica:
  - Esta lógica se ejecuta solo cuando el backend responde con libro válido (no `setup_required`).

- Fecha: 2026-06-07
- Módulo: Reorganización académica (Periodo → Trimestre → Parcial → Insumos)
- Cambios implementados:
  - Backend (`backend/src/routes/academico.routes.js`):
    - Nuevo endpoint `GET /api/academico/periodos`.
    - Nuevo endpoint `GET /api/academico/parciales?asignacion_id=&trimestre_id=`.
    - Ajuste en `POST /api/academico/parciales` para nombre estándar `PARCIAL N`.
    - Nuevo endpoint `DELETE /api/academico/parciales/:id` con reglas:
      - PARCIAL 1 y PARCIAL 2 no eliminables.
      - Solo parciales opcionales (orden 3+) eliminables.
      - Elimina insumos y notas vinculadas del parcial eliminado.
  - Frontend profesor (`frontend/assets/js/profesor-academico.js`):
    - Se agregó selector de año lectivo (`/api/academico/periodos`) y filtro por periodo.
    - Se reorganizó la vista para mostrar lista/chips de parciales con botón `+`.
    - Se agregó tachito de eliminación solo para parciales opcionales (3+).
    - Se implementó fallback visual cuando falta estructura SQL nueva:
      - muestra `PARCIAL 1` y `PARCIAL 2` para visualizar la estructura,
      - bloquea guardado real y muestra aviso claro de “modo visual”.
- Estado actual:
  - Si falta ejecutar `database/academico-parciales-insumos.sql`, ya no desaparece la lista de parciales: se muestra estructura base visual.
  - Cuando la base esté lista, la gestión de parciales opera de forma real con persistencia.

- Fecha: 2026-06-07
- Módulo: Catálogo de insumos (Portal Profesor)
- Ajuste solicitado por usuario:
  - Los insumos permitidos/visibles en la UI quedan definidos como:
    1. Tareas
    2. Actividad Individual
    3. Actividad Grupal
    4. Leccion
    5. Prueba
- Implementación técnica:
  - Archivo: `frontend/assets/js/profesor-academico.js`
  - Se actualizaron las etiquetas visibles (`tipoLabel`) para reflejar el catálogo solicitado.
  - Se ajustó el orden de botones del toolbar de creación de insumos a:
    - `TAREA`, `INDIVIDUAL`, `TALLER`, `LECCION`, `APORTE`
  - Equivalencias internas:
    - `TAREA` → Tareas
    - `INDIVIDUAL` → Actividad Individual
    - `TALLER` → Actividad Grupal
    - `LECCION` → Leccion
    - `APORTE` → Prueba
