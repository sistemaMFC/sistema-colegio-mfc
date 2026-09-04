# Plan de fases del módulo profesor

Fecha: 2026-09-03

## Objetivo

Definir una ruta clara de mejora para el portal del profesor, manteniendo la separación de responsabilidades entre administración, matrícula y docente, sin romper la base actual del sistema.

---

## Fase 1 — Base estable y separación de roles

### Objetivo

Dejar el módulo docente aislado del resto del sistema y validar que la lógica accidentalmente no dependa de flujo administrativo.

### Acciones

- mantener el admin sin cambios
- mantener matrícula sin cambios
- aislar la lógica del profesor en su propio flujo
- validar la base real antes de cualquier cambio técnico
- asegurar que cada vista docente use datos del docente y no de otros roles

### Estado

Completado parcialmente en la práctica actual, con la estructura docente funcionando como módulo independiente.

---

## Fase 2 — Reorganización del portal docente

### Objetivo

Dar claridad al profesor y convertir la materia en el eje central del trabajo académico.

### Acciones

- priorizar materias por docente
- agrupar contenido por curso y paralelo
- organizar la vista por trabajo real del profesor
- dejar el enfoque en asistencia, insumos, parciales, notas y reportes
- reducir ruido visual y mejorar la legibilidad

### Estado

Completado con una estructura más compacta y profesional.

---

## Fase 3 — Validación académica real

### Objetivo

Corroborar que el sistema académico respeta el esquema real de la base de datos y no asume tablas o columnas inexistentes.

### Acciones

- validar tablas de asignaciones, parciales, insumos y notas
- verificar campos reales de docentes, cursos, paralelos y periodos
- reforzar la lógica de carga por alumno, materia y periodo
- crear datos de prueba si hace falta para validación funcional

### Estado

Ejecutado con validación real del esquema y generación de registros para pruebas académicas.

---

## Fase 4 — Asistencia, notas y evaluación

### Objetivo

Llevar al docente un flujo operativo real para controlar su trabajo académico durante el periodo.

### Acciones

- registrar asistencia por materia y curso
- crear insumos y parciales
- asociar notas a cada estudiante
- consolidar el resumen del rendimiento por asignatura
- preparar la base para la generación de reportes

### Estado

En avance: la estructura está lista y la lógica está apuntando al flujo real del docente, pero aún requiere más integración con datos reales y procesos de cierre.

---

## Fase 5 — Migración de datos y consolidación

### Objetivo

Integrar información real del periodo, especialmente cuando se tiene un PDF o registro externo que debe convertirse al sistema.

### Acciones

- mapear alumnos, materias, curso y paralelo
- transformar los datos del documento a la estructura del sistema
- generar los registros de parciales, insumos y notas
- revisar inconsistencias antes de activar la vista final

### Estado

Pendiente de ejecución cuando se entreguen los valores reales de cada estudiante, materia y parcial.

---

## Fase 6 — Reportes y cierre académico

### Objetivo

Dar al profesor una vista consolidada del progreso académico, con indicadores visibles para decisiones de seguimiento.

### Acciones

- reportes por estudiante
- reportes por materia
- indicadores de asistencia
- resumen por parcial y cierre de evaluación
- exportación o revisión para seguimiento institucional

### Estado

Pendiente como última etapa funcional del módulo.

---

## Criterios de éxito por fase

- cada fase debe ser verificable con datos reales
- no debe romper flujo de admin ni matrícula
- cada cambio debe estar documentado
- cada mejora debe respetar modularidad y escalabilidad
- el profesor debe contar con un flujo claro y ejecutable

---

## Recomendación final

La estrategia correcta es continuar por fases, validando cada pieza con la base real antes de escalar visualmente. Esto evita errores de arquitectura y mantiene la plataforma estable mientras el módulo docente gana funcionalidad.

El siguiente paso lógico es avanzar desde la estructura actual hacia la parte operativa real de asistencia, notas y reportes, sin mezclar responsabilidades con administración ni matrícula.
