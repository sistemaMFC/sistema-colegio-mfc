# Evolución del portal profesor y escalabilidad del sistema

Fecha: 2026-09-03

## Propósito

Este documento amplía la documentación técnica del portal del profesor para registrar no solo los cambios realizados, sino también la lógica de evolución del sistema, los criterios de escalabilidad, el impacto de cada decisión y la base para futuras mejoras.

---

## 1. Visión general

El portal del profesor no fue un módulo aislado desde el inicio. Se originó como parte del proceso académico del docente, pero al ir avanzando surgieron varios problemas de arquitectura, experiencia y separación de responsabilidades.

El trabajo principal fue convertirlo de una vista mezclada y poco clara, a un flujo académico bien definido por materia, con criterios profesionales y una estructura que pueda crecer sin romper el resto de la plataforma.

---

## 2. Qué se tenía antes

### Estado inicial observado

- El portal docente se mezclaba visualmente con administración y matrícula.
- La lógica de la materia estaba poco definida.
- Las tareas académicas no estaban agrupadas por flujo de trabajo.
- La base de datos y el frontend asumían estructuras sin validar primero la realidad del sistema.
- No había una distinción clara entre módulos de profesor, estudiante, matrícula y administración.
- El diseño no estaba orientado al usuario docente ni a la operatividad diaria.

### Problemas de diseño

- Duplicación de contenido.
- Orden visual débil.
- Componentes reutilizados sin contexto real.
- Falta de prioridad clara en funciones clave: asistencia, insumos, notas, reportes.

### Problemas de arquitectura

- Dependencia excesiva de suposiciones sobre la base.
- Riesgo de romper la lógica académica si cambian nombres de tablas o columnas.
- Escasa capacidad de escalar el módulo sin reforzar la estructura del sistema.

---

## 3. Qué se corrigió

### 3.1 Separación de responsabilidades

Se definió claramente que:

- el admin conserva su flujo propio
- la matrícula mantiene su lógica propia
- el profesor se enfoca en el trabajo académico del curso y la materia

Esto fue clave para evitar regresiones y mantener la escalabilidad del sistema.

### 3.2 Validación real de la base de datos

Se dejó de asumir que el esquema era el esperado y se validó la estructura real antes de continuar.

Esto evitó errores técnicos y redujo el costo de mantenimiento.

### 3.3 Reorganización del portal docente

Se pasó de una vista general y poco funcional a un diseño centrado en:

- materias del docente
- resumen del curso
- asistencia
- insumos
- parciales
- notas
- reportes

### 3.4 Reducción de ruido visual

Se compactó la información para que la pantalla no fuera excesivamente pesada, sin perder seriedad ni claridad.

---

## 4. Estado actual del módulo

### Lo que funciona bien

- La vista docente está separada del resto del sistema.
- La materia es el eje central del trabajo.
- Se visualiza una estructura de trabajo más entendible para el profesor.
- El módulo tiene mejor organización y se adapta mejor a la operación real.
- El diseño es más profesional y compacto.
- La base tecnológica está más alineada con la realidad del proyecto.

### Lo que todavía requiere evolución

- Necesidad de más conectividad con datos reales de asistencia.
- Mejor detalle de notas por estudiante y por insumo.
- Consolidación real de reportes.
- Flujo más específico para firma de evaluación y control por parcial.
- Mayor nivel de automatización y validación.

---

## 5. Comparativa: antes vs ahora

### Antes

- Mezcla de módulos.
- Información desordenada.
- Dificultad de comprensión para el docente.
- Suposiciones de esquema.
- Diseño poco claro y poco escalable.

### Ahora

- Enfoque por materia.
- Flujo académico claro.
- Módulo más legible y profesional.
- Menor riesgo de errores por inconsistencias de datos.
- Mejor base para evolucionar y escalar.

---

## 6. Criterios de escalabilidad

Para que el módulo pueda crecer sin romper el sistema, se recomienda mantener estos principios:

### 6.1 Separación por rol

Cada rol debe tener flujo y pantalla propios. El profesor no debe depender del admin ni de la matrícula.

### 6.2 Estructura modular

Cada tema debe estar aislado en bloques funcionales:

- materias
- asistencia
- insumos
- notas
- reportes
- documentación

### 6.3 Validación de datos antes de cambios visuales

Todo rediseño debe ir acompañado de validación del backend real y del esquema DB.

### 6.4 Diseño centrado en la tarea

La interfaz debe responder a acciones reales del docente: registrar notas, controlar asistencia, revisar parciales y reportar avances.

### 6.5 Nuevas funciones sin romper patrones existentes

La incorporación de nuevas secciones debe hacerse siguiendo el patrón actual, para mantener consistencia y facilidad de mantenimiento.

---

## 7. Riesgos si no se mantiene esta estructura

Si se vuelve a mezclar flujo académico con administrativo, o si se construye sobre suposiciones del sistema, se pueden repetir varios problemas:

- errores de esquema
- cambios visuales sin soporte real
- pérdidas de contexto del usuario
- dificultad de mantenimiento
- crecimiento caótico del sistema
- costos altos de corrección

---

## 8. Recomendaciones para la siguiente etapa

### Recomendación técnica

- validar cada endpoint nuevo contra la base real
- mantener la separación profesor/admin
- documentar cada cambio funcional en la carpeta docs
- usar un enfoque modular por cada asignatura

### Recomendación funcional

- dejar cada materia con su propio resumen ejecutable
- priorizar asistencia real y notas por estudiante
- crear reportes con indicadores claros
- definir una estructura de actualización para parciales, insumos y cierre trimestral

### Recomendación de crecimiento

- preparar la base para soportar más docentes, materias y periodos
- definir una capa de validación para datos académicos
- preparar la vista para expandirse sin romper el diseño general

---

## 9. Conclusión

El portal del profesor evolucionó de una vista mezclada y poco clara a una estructura más serena, ordenada y útil para la práctica docente. Este cambio no fue solo de estilo, sino de arquitectura de información y claridad de responsabilidades.

La principal lección es que la escalabilidad del sistema depende de la disciplina de separación, validación y modularidad. Si se mantiene esa lógica, el módulo puede crecer sin reventar el resto del sistema.

---

## 10. Bitácora

- 2026-09-03: Se documenta la evolución del módulo profesor, los cambios correctivos, el estado actual y la estrategia de escalabilidad para futuras fases.
