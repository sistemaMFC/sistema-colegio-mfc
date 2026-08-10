# Documentación Backend - Sistema Colegio MFC

Fecha de actualización: 2026-06-06

## 1) Arquitectura backend

- Runtime: Node.js
- Framework: Express
- Base de datos: MySQL (mysql2/promise)
- Autenticación: JWT Bearer
- Hash de contraseñas: bcrypt

Archivo de entrada:
- `backend/src/server.js`

### Flujo general

1. Carga variables de entorno (`dotenv`).
2. Inicializa middlewares globales (CORS, JSON/urlencoded limit 1mb).
3. Registra rutas por módulos.
4. Sirve frontend estático desde `frontend/`.
5. Maneja 404 y errores globales.

## 2) Configuración y conexión a BD

Archivo:
- `backend/src/db.js`

Responsabilidades:
- Crea pool MySQL con credenciales desde `.env`.
- Valida conexión al arrancar.
- Exporta el pool para uso global.

Variables esperadas:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`.

Riesgo:
- Si una variable falta o la conexión falla, el proceso termina (`process.exit(1)`).

## 3) Seguridad y autenticación

Archivo:
- `backend/src/middlewares/auth.js`

Middlewares:
- `authRequired`: exige `Authorization: Bearer <token>`, valida JWT y setea `req.user`.
- `onlyAdmin`: restringe acceso a rol `ADMIN`.

Comportamiento:
- Si `JWT_SECRET` no está definido, backend no arranca (correcto por seguridad).

## 4) Módulos de rutas backend

### 4.1 Auth (`backend/src/routes/auth.routes.js`)
Endpoints:
- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/me`
- `PUT /auth/me/password`

Resumen:
- Login por cédula + contraseña con bcrypt.
- Emite JWT por 8h.
- Permite actualizar perfil y contraseña propia.

### 4.2 Students (`backend/src/routes/students.routes.js`)
Endpoints:
- `POST /api/students` (ADMIN)
- `GET /api/students`
- `PUT /api/students/:id` (ADMIN)
- `GET /api/students/:id`
- `DELETE /api/students/:id` (ADMIN)

Resumen:
- CRUD de estudiantes y datos de representante.
- Listado con JOIN a cursos.
- Soporta actualización rápida de estado/curso.

Riesgo:
- En edición completa, si `fecha_nac` viene vacía se coloca `2015-01-01` (regla a validar funcionalmente).

### 4.3 Enrollments (`backend/src/routes/enrollments.routes.js`)
Endpoints:
- `POST /api/enrollments`
- `POST /api/enrollments/asignar-manual`
- `POST /api/enrollments/distribuir`
- `GET /api/enrollments`
- `PUT /api/enrollments/:id/estado`

Resumen:
- Matrícula con transacción.
- Generación automática de cargos.
- Distribución por paralelo.

### 4.4 Pagos (`backend/src/routes/pagos.routes.js`, `backend/src/controllers/pagos.controller.js`)
Endpoints:
- `GET /api/pagos/estado/:id`
- `POST /api/pagos/cobrar`
- `POST /api/pagos/generar-ciclo`
- `POST /api/pagos/agregar-extra`

Resumen:
- Consulta de deudas, cobros, generación de ciclo y extras.
- Acceso restringido a ADMIN/COLECTOR/SECRETARIA.

Riesgo importante:
- Coexisten lógica de esquema legacy y esquema nuevo (fallback por columnas), lo que indica transición parcial del modelo de pagos.

### 4.5 Académico / Profesor / Admin
Archivos:
- `backend/src/routes/academico.routes.js`
- `backend/src/routes/profesor.routes.js`
- `backend/src/routes/admin.routes.js`

Resumen:
- Académico: libro, parciales, insumos, notas, reportes.
- Profesor: perfil, tutorías, asistencia, contexto docente.
- Admin: usuarios, cursos, materias, asignaciones y tutorías.

## 4.6 Setup y registro de rutas
Archivo:
- `backend/src/server.js`

Cambios recientes:
- Se agregó la ruta de inicialización `/setup` con `backend/src/routes/setup.routes.js`.
- Se registraron rutas faltantes como `/api/enrollments` y `/api/profesor`.
- El servidor sirve el frontend estático desde `frontend/` y valida CORS según el origen en producción.
- El backend usa variables de entorno para CORS permitido (`CORS_ORIGIN` o `FRONTEND_URL`).

## 5) Rutas registradas en servidor

Archivo:
- `backend/src/server.js`

Montajes:
- `/auth`
- `/api/admin`
- `/api/students`
- `/api/academico`
- `/api/pagos`
- `/api/enrollments`
- `/api/profesor`

## 6) Errores/riesgos detectados (backend)

1. Modelo financiero híbrido (legacy + nuevo).
2. Archivos de rutas muy grandes con mucha lógica embebida.
3. Dependencia fuerte del esquema exacto de BD entre ambientes.
4. Validaciones funcionales dispersas.

## 7) Qué falta y cómo abordarlo (backend)

Prioridad alta:
1. Definir un esquema único oficial de BD por módulo.
2. Cerrar migración de pagos y retirar fallback legacy.
3. Separar rutas grandes en controladores/servicios.
4. Agregar pruebas API mínimas por endpoint crítico.

Prioridad media:
1. Estandarizar respuestas JSON.
2. Agregar logger estructurado.
3. Crear documentación técnica por endpoint con ejemplos request/response.
