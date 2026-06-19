# TODO - Ajustes finales Bachillerato + Especialidades + Académico Admin/Profesor

## En progreso
- [ ] Corregir error 500 en `POST /api/enrollments/distribuir` cuando `especialidad_id` llega null/vacío.
- [ ] Ajustar frontend de distribución para evitar warning `aria-hidden` por foco retenido al cerrar modal.
- [ ] Validar distribución en paralelo destino con y sin especialidad.

## Frontend
- [ ] Homologar estructura visual de Académico Admin con Profesor (manteniendo permisos diferentes).
- [ ] Mostrar especialidad en flujos de Matrículas/Distribución y Académico.
- [ ] Limitar acciones de Profesor a su alcance.

## Documentación
- [ ] Actualizar `docs/funcionamiento-sistema.md` con fecha y resumen técnico de la corrección de distribución.
- [ ] Dejar registro final de archivos/rutas ajustadas (`enrollments.routes.js`, `view-cursos.js`).

## Validación pendiente
- [ ] Checklist de pruebas Admin.
- [ ] Checklist de pruebas Profesor.
