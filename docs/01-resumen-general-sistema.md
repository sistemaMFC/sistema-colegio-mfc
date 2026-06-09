# Resumen General del Sistema — Colegio MFC

Fecha: 2026-06-07

## 1) ¿Qué es este sistema?

Sistema web escolar para operación académica y administrativa del Colegio MFC.  
Integra autenticación por roles, gestión de estudiantes, matrículas, asignaciones docentes, registro académico (insumos/notas) y pagos.

## 2) Stack técnico

- Frontend: HTML + CSS + JavaScript vanilla (múltiples vistas)
- Backend: Node.js + Express
- Base de datos: MySQL
- Autenticación: JWT (Bearer Token)
- Deploy actual: Render

## 3) Estructura principal del repositorio

- `frontend/` → vistas y scripts cliente
- `backend/src/` → servidor, rutas, middlewares, controladores
- `database/` → scripts SQL de seed/fix
- `docs/` → documentación funcional/técnica

## 4) Roles y acceso funcional

- `ADMIN`: control total del sistema
- `SECRETARIA`: operación administrativa y académica parcial
- `COLECTOR`: foco en pagos/cobros
- `PROFESOR`: portal académico docente (insumos, notas, asistencia, tutoría)

## 5) Flujos principales actuales

1. Login (`/auth/login`) con JWT.
2. Redirección por rol:
   - Profesor → `profesor-academico.html`
   - Admin/Secretaría/Colector → `app.html`
3. Módulos operativos:
   - Estudiantes
   - Matrículas/Enrollments
   - Académico (trimestres, parciales, insumos, notas)
   - Asistencia
   - Pagos
   - Administración de usuarios

## 6) Qué tiene de bueno (fortalezas)

- Separación por rol bien definida en flujo de acceso.
- Módulo académico ya encaminado a tablas oficiales (`calificaciones`, `matriculas`, `asignaciones_docente`).
- Portal de profesor funcional con endpoints propios.
- Middleware de JWT con validación estricta (`JWT_SECRET` obligatorio).
- Documentación existente y en crecimiento.

## 7) Qué tiene de malo (debilidades actuales)

- Deuda técnica alta en algunos archivos de rutas (muy extensos y con mucha lógica acoplada).
- Diferencias de madurez entre módulos (ej.: Asistencia profesor más avanzada que admin).
- Dependencia de estados de configuración (ej.: setup de parciales/insumos) que puede romper UX inicial.
- Riesgo de inconsistencias por coexistencia de enfoques legacy/nuevo en ciertos procesos.
- Cobertura de pruebas automatizadas limitada o inexistente.

## 8) Qué falta (pendientes clave)

- Completar homologación visual y funcional Profesor/Admin en Asistencia e Insumos.
- Consolidar módulo de pagos a un modelo único de negocio.
- Endurecer validaciones backend y manejo consistente de errores.
- Agregar pruebas API y pruebas funcionales de UI.
- Documentar contratos de endpoints con ejemplos formales.

## 9) Ideas de mejora concretas

- Dividir rutas largas en servicios + repositorios para reducir complejidad.
- Introducir esquema de validación (Joi/Zod) para payloads.
- Estandarizar respuestas API (`success`, `data`, `error`, `meta`).
- Crear suite de smoke tests (login, libro académico, guardar nota, asistencia).
- Implementar bitácora de cambios obligatoria por módulo.

## 10) Estado operativo general

- Sistema desplegado y conectando a MySQL en producción.
- Funcional en escenarios principales.
- Requiere cierre de brechas de UX, consistencia y pruebas para mayor robustez.

## Bitácora

- 2026-06-09: se igualo visualmente Academico Admin con Portal Profesor mediante pestanas de Materias, Asistencia, Simulacion, Documentacion y Mensajes, conservando permisos globales de ADMIN.
- 2026-06-09: se reforzo la seguridad academica: ADMIN ve y modifica todo; PROFESOR solo recibe materias, cursos y paralelos asociados a sus asignaciones activas.
- 2026-06-08: se agrego soporte inicial para Bachillerato con especialidades, estudiantes semilla, materias tecnicas y filtro academico por especialidad.
- 2026-06-08: se agrego apartado de Simulacion en portal profesor para probar mas de 10 notas por estudiante, insumos, examen trimestral separado y libreta imprimible/PDF sin tocar datos reales.
- 2026-06-07: creación de resumen general consolidado para uso humano e integración con otras IA.
