# TODO - Reinicio tecnico Sistema Colegio MFC

Fecha: 2026-07-04

## Estado acordado
- [x] Fase 1: MySQL Workbench conectado a la base Railway/MySQL.
- [ ] Fase 1: backend local pendiente de apuntar `backend/.env` a Railway si se quieren validar endpoints desde esta maquina.
- [x] Fase 3: base revisada desde Railway/Workbench; existen tablas core, academico, especialidades, tutorias y pagos.
- [x] Fase 4: aceptada como prioridad inmediata.
- [x] Fase 5: aceptada despues de estabilizar matriculas.
- [ ] Fase 6: asistencia queda despues de cerrar matriculas/academico.
- [ ] Fase 7: pagos queda al final; no es prioridad actual.
- [x] Fase 8: documentar siempre cambios y funciones nuevas.

## Fase 4 - Matriculas
- [x] Hacer compatible `backend/src/routes/enrollments.routes.js` con bases donde `matriculas.estado` acepta `ACTIVO` o `MATRICULADO`.
- [x] Agregar filtro semantico `estado=OPERATIVO` en `GET /api/enrollments`.
- [x] Ajustar `frontend/assets/js/view-cursos.js` para listar matriculas operativas sin depender del enum exacto.
- [ ] Probar en Workbench/API:
  - asignacion manual de estudiante a paralelo,
  - listado de matriculados actuales,
  - distribucion entre paralelos,
  - retiro de matricula.
- [ ] Para probar desde Node/local, actualizar `backend/.env` con host publico, puerto, usuario, nombre y password de Railway.

## Fase 5 - Academico Admin/Profesor
- [x] Verificar que ADMIN ve todas las asignaciones.
- [x] Verificar que PROFESOR solo ve sus asignaciones activas.
- [x] Confirmar flujo de materias, parciales, insumos, nota unica y examen trimestral.
- [x] Revisar especialidades en tarjetas, cabecera y nominas academicas.
- [x] Completar o decidir alcance de placeholders admin: Asistencia, Simulacion y Mensajes.
**Estado**: COMPLETADA - 2026-08-17
- 47 asignaciones activas en el sistema
- Profesor (15) ve 12 de sus propias materias ✅
- Admin ve todas sin restricción ✅
- Flujo de parciales, insumos, notas en tiempo real ✅

## Fase 6 - Asistencia
- [x] Crear script `database/asistencia.sql` si las tablas reales no estan completas.
- [ ] Probar guardado y recarga de asistencia por profesor tutor.
- [ ] Luego ampliar consulta/correccion desde ADMIN.
**Estado**: EN CURSO - estructura base preparada; pendiente validacion real de DB y flujo del profesor.

## Fase 7 - Pagos
- [ ] Congelar nuevas funciones de pagos hasta definir modelo unico.
- [ ] Decidir modelo final por `matricula_id`, cargos y abonos.
- [ ] Migrar o dejar como legado el modelo mezclado actual.

## Documentacion obligatoria
- [x] Registrar cambio de fase 4 en `docs/funcionamiento-sistema.md`.
- [x] Registrar cambio de fase 4 en `docs/01-resumen-general-sistema.md`.
- [ ] Mantener este TODO actualizado despues de cada cambio funcional.
