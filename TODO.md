# TODO - Correcciones de error backend (académico)

- [x] Corregir UPSERT de `/api/academico/notas` en `backend/src/routes/academico.routes.js` para no usar columna inexistente `updated_at`.
- [x] Documentar el cambio en `docs/funcionamiento-sistema.md` con fecha.
- [x] Validar sintaxis básica del backend para confirmar que no se rompió el archivo editado. (La carga directa de rutas se detuvo por falta de `JWT_SECRET` en entorno local; no se detectaron errores de sintaxis del cambio aplicado).
