# Auditoría de Base de Datos — Sistema MFC
**Fecha:** 2026-06-08  
**Objetivo:** documentar qué tablas existen/usa el sistema, cuáles están bien, cuáles están mezcladas o en riesgo, y qué conviene mantener/migrar/eliminar.

---

## 1) Base de datos objetivo

Según el proyecto, la base principal es **`sistema_educativo`** (MySQL/Railway).

---

## 2) Tablas detectadas en uso por el código (backend actual)

> Fuente: revisión de consultas SQL en `backend/src/routes/*.js` y `backend/src/controllers/*.js`.

### Núcleo de identidad y acceso
- `usuarios` ✅ (uso correcto)
- `docentes` ✅ (uso correcto)

### Núcleo académico oficial (recomendado)
- `periodos_lectivos` ✅
- `cursos` ✅
- `paralelos` ✅
- `materias` ✅
- `trimestres` ✅
- `tipos_evaluacion` ✅
- `asignaciones_docente` ✅
- `matriculas` ✅
- `estudiantes` ✅
- `calificaciones` ✅
- `tutorias` ✅

### Modelo académico nuevo (parciales/insumos)
- `academico_parciales` ✅
- `academico_insumos` ✅
- `academico_notas_insumos` ✅
- `academico_examenes_trimestrales` ✅

### Asistencia
- `asistencias` ✅
- `asistencia_detalle` ✅

### Pagos (actualmente mezclado/riesgoso)
- `cargos_estudiante` ⚠️
- `conceptos_cobro` ⚠️
- `pagos` ⚠️
- (mencionadas en documentación pero no foco actual de rutas revisadas: `pagos_abonos`, `pagos_pension`, `pensiones_config`, `pensiones_meses`) ⚠️

### Tablas legadas mencionadas (no recomendadas para nuevo desarrollo)
- `notas` ⛔ legado
- `asignacion_materias` ⛔ legado
- `tutores_curso` ⛔ legado

---

## 3) Qué se está usando bien (estable)

## A. Módulo Académico
**Archivo principal:** `backend/src/routes/academico.routes.js`

Usa correctamente:
- `asignaciones_docente`, `docentes`, `usuarios`
- `matriculas`, `estudiantes`
- `materias`, `cursos`, `paralelos`, `periodos_lectivos`
- `trimestres`, `tipos_evaluacion`
- `calificaciones`
- `academico_*` (parciales, insumos, notas_insumos, examenes_trimestrales)

**Estado:** ✅ Bien orientado al modelo oficial.

## B. Módulo Admin
**Archivo principal:** `backend/src/routes/admin.routes.js`

Usa correctamente:
- `usuarios`, `docentes`
- `materias`, `cursos`, `paralelos`, `periodos_lectivos`
- `asignaciones_docente`
- `tutorias`

**Estado:** ✅ Correcto para operación administrativa.

## C. Módulo Profesor
**Archivo principal:** `backend/src/routes/profesor.routes.js`

Usa correctamente:
- `docentes`, `usuarios`
- `asignaciones_docente`, `materias`, `cursos`, `paralelos`, `periodos_lectivos`
- `tutorias`, `matriculas`, `estudiantes`
- `asistencias`, `asistencia_detalle`

**Estado:** ✅ Bien acoplado al flujo actual.

## D. Matrículas / Enrollments
**Archivo:** `backend/src/routes/enrollments.routes.js`

Usa:
- `matriculas`, `estudiantes`, `periodos_lectivos`, `cursos`, `paralelos`
- `cargos_estudiante`, `conceptos_cobro` (por integración con pagos/cargos)

**Estado:** ✅ Operativo, pero con dependencia del modelo de pagos pendiente de cierre.

---

## 4) Qué se está usando mal o en riesgo (mezcla técnica)

## 4.1 Pagos con doble modelo (principal riesgo)
**Archivo:** `backend/src/controllers/pagos.controller.js`

Se observa mezcla:
- se inserta en `pagos` con `estudiante_id` + `concepto` texto
- y en paralelo se actualiza `cargos_estudiante` por `cargo_id/matricula_id`

**Problema:**
- mezcla de deuda por estudiante vs deuda por matrícula/período.
- riesgo de inconsistencias históricas y reportes financieros ambiguos.

**Estado:** ⚠️ En uso, pero **arquitectura mezclada**.

---

## 5) Tablas que debes mantener (recomendación fuerte)

Mantener como **core oficial**:

1. `usuarios`
2. `docentes`
3. `estudiantes`
4. `matriculas`
5. `periodos_lectivos`
6. `cursos`
7. `paralelos`
8. `materias`
9. `trimestres`
10. `tipos_evaluacion`
11. `asignaciones_docente`
12. `tutorias`
13. `calificaciones`
14. `academico_parciales`
15. `academico_insumos`
16. `academico_notas_insumos`
17. `academico_examenes_trimestrales`
18. `asistencias`
19. `asistencia_detalle`

---

## 6) Tablas que recomiendo NO usar para desarrollo nuevo

1. `notas` → legado, estructura antigua sin alineación fuerte con asignación/matrícula.
2. `asignacion_materias` → duplicada frente a `asignaciones_docente`.
3. `tutores_curso` → duplicada frente a `tutorias`.

**Recomendación:** no borrar aún, primero respaldar y validar que no haya datos críticos sin migrar.

---

## 7) Tablas a revisar para posible eliminación (después de migración)

## Candidatas (condicional):
- `notas`
- `asignacion_materias`
- `tutores_curso`
- tablas financieras duplicadas que queden fuera del modelo final de pagos

**Solo eliminar si:**
1. ya no tienen lecturas/escrituras en código productivo,
2. existe backup SQL verificado,
3. datos históricos útiles ya fueron migrados o archivados.

---

## 8) Recomendación de arquitectura final (resumen)

## 8.1 Académico (cerrar y mantener)
- Consolidar el nuevo flujo `academico_*` + `calificaciones`.
- Mantener `calificaciones` para compatibilidad/reportes mientras completas transición total.

## 8.2 Matrículas (mantener oficial)
- Toda pertenencia del estudiante al curso/paralelo/período debe salir de `matriculas`.

## 8.3 Pagos (prioridad alta de saneamiento)
Elegir una sola línea:
- Deuda por `matricula_id` (recomendada), con catálogo en `conceptos_cobro`.
- Pagos/abonos siempre vinculados a deuda y período.

Evitar nuevas rutas que escriban “solo por estudiante” sin matrícula.

---

## 9) Plan de acción por fases

## Fase 1 — Inventario y congelamiento de legado
- Marcar tablas legado como “solo lectura” operativa.
- No crear nuevas features sobre legado.

## Fase 2 — Cierre de pagos
- Definir modelo final (matrícula-céntrico).
- Ajustar controladores/rutas para una sola vía.
- Migrar registros intermedios necesarios.

## Fase 3 — Limpieza controlada
- Respaldar.
- Verificar cero uso en código.
- Archivar/eliminar tablas legado.

---

## 10) Checklist obligatorio antes de eliminar cualquier tabla

1. Backup completo SQL (estructura + datos).
2. Backup probado (restore en entorno de prueba).
3. Confirmar cero referencias en backend/frontend/reportes.
4. Confirmar cero jobs externos que consuman esa tabla.
5. Aprobación funcional (administración).
6. Eliminación en ventana controlada + script versionado.

---

## 11) Matriz rápida: tabla ↔ estado recomendado

- **Mantener (core):** `usuarios`, `docentes`, `estudiantes`, `matriculas`, `periodos_lectivos`, `cursos`, `paralelos`, `materias`, `trimestres`, `tipos_evaluacion`, `asignaciones_docente`, `tutorias`, `calificaciones`, `academico_*`, `asistencias`, `asistencia_detalle`.
- **Migrar/normalizar:** `cargos_estudiante`, `conceptos_cobro`, `pagos` (por mezcla actual).
- **Legado (no nuevo desarrollo):** `notas`, `asignacion_materias`, `tutores_curso`.
- **Eliminar (solo con backup + validación):** legado/duplicadas tras migración efectiva.

---

## 12) Conclusión ejecutiva

Tu base **sí tiene una estructura buena** para operar el sistema escolar moderno.  
El mayor punto a corregir no es académico, sino **pagos** (modelo mezclado).  
Si cierras pagos y congelas legado, tendrás una BD estable, auditable y mantenible.
