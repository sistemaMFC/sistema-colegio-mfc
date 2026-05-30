# TODO - Fase 1 mejoras operativas (tutorias, asistencia, distribucion)

- [x] Corregir UPSERT de `/api/academico/notas` en `backend/src/routes/academico.routes.js` para no usar columna inexistente `updated_at`.
- [x] Documentar el cambio en `docs/funcionamiento-sistema.md` con fecha.
- [x] Validar sintaxis básica del backend para confirmar que no se rompió el archivo editado. (La carga directa de rutas se detuvo por falta de `JWT_SECRET` en entorno local; no se detectaron errores de sintaxis del cambio aplicado).
- [ ] Backend: agregar endpoints de asistencia para tutor en `backend/src/routes/profesor.routes.js`.
- [ ] Frontend profesor: conectar asistencia a backend en `frontend/assets/js/profesor-academico.js`.
- [ ] Mejorar validaciones de distribucion manual en `backend/src/routes/enrollments.routes.js`.
- [ ] Documentar cambios de Fase 1 con fecha en `docs/funcionamiento-sistema.md`.
