# TODO - Corrección endpoint enrollments (error 500)

- [x] Identificar causa del 500 en `GET /api/enrollments` con evidencia de esquema real.
- [x] Corregir `backend/src/routes/enrollments.routes.js` para usar `matriculas.fecha_registro` y mantener alias de respuesta `fecha_matricula`.
- [ ] Documentar cambios con fecha en `docs/funcionamiento-sistema.md`.
- [ ] Validar endpoint y flujo UI de "Ver matriculados".
