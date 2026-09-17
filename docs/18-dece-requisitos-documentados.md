# Documentación del módulo DECE — requisitos, orden y estado

Fecha: 2026-09-16

## 1. Objetivo

Este documento consolida la estructura funcional del módulo DECE, el orden recomendado de implementación, el alcance operativo del sistema y el estado actual de cada requisito solicitado.

La lógica del módulo no debe entenderse como una copia literal del documento de referencia, sino como una implementación funcional de la estructura documental, con flujo operativo, validaciones y separación de módulos.

## 2. Requisitos del DECE ordenados por bloque

### Bloque 1. Gestión interna del DECE

Objetivo:
- centralizar la administración interna del área DECE;
- registrar casos, atenciones, documentos, actividades y seguimientos;
- mantener información operativa del departamento.

Incluye:
- dashboard del DECE;
- casos;
- atenciones;
- documentos;
- actividades;
- talleres;
- listas por curso;
- faltas injustificadas;
- derivaciones internas;
- resumen general del módulo.

Estado actual:
- Implementado funcionalmente.
- Conectado con backend y frontend.
- Validado con rutas y permisos.

### Bloque 2. Derivaciones externas

Objetivo:
- registrar y controlar derivaciones hacia especialistas o instituciones externas;
- registrar motivo, área y estado;
- mantener seguimiento de la ruta de atención.

Incluye:
- tipo de derivación;
- área de destino;
- estudiante y curso;
- motivo de la derivación;
- estado de la derivación;
- responsable.

Estado actual:
- Implementado funcionalmente.

### Bloque 3. Reportes e informes para docentes

Objetivo:
- entregar indicadores y resúmenes para apoyar la gestión docente y la coordinación.

Incluye:
- total de casos;
- total de atenciones;
- casos remitidos por docentes;
- prioridad de casos;
- tipos de atención;
- origen de remisiones;
- evolución por mes.

Estado actual:
- Implementado funcionalmente.

### Bloque 4. Rutas y protocolos ante violencia

Objetivo:
- registrar incidentes de violencia o alarmas de riesgo;
- documentar la ruta de atención;
- dejar evidencia del procedimiento realizado.

Incluye:
- estudiante y curso;
- tipo de incidente;
- nivel de riesgo;
- descripción del hecho;
- acciones realizadas;
- responsable;
- estado del protocolo.

Estado actual:
- Implementado funcionalmente.

### Bloque 5. Necesidades Educativas Especiales (NEE)

Objetivo:
- registrar estudiantes con necesidades educativas especiales;
- documentar apoyo y nivel de intervención;
- mantener trazabilidad del caso para coordinación docente y DECE.

Incluye:
- estudiante y curso;
- tipo de necesidad;
- nivel de intensidad;
- descripción;
- apoyo recomendado;
- responsable;
- estado activo o en seguimiento.

Estado actual:
- Implementado funcionalmente.

## 3. Orden correcto de implementación

La secuencia recomendada fue la siguiente:

1. Gestión interna del DECE
2. Derivaciones externas
3. Reportes e informes para docentes
4. Protocolos ante violencia
5. NEE

Este orden mantiene el módulo estable, evita mezclar funciones distintas en una sola vista y permite construir la lógica de negocio de forma progresiva.

## 4. Estructura técnica implementada

### Backend

Se añadió la lógica del sistema DECE en:
- backend/src/routes/dece.routes.js

Incluye rutas para:
- /api/dece/dashboard
- /api/dece/casos
- /api/dece/atenciones
- /api/dece/gestion/resumen
- /api/dece/documentos
- /api/dece/actividades
- /api/dece/talleres
- /api/dece/listas
- /api/dece/faltas
- /api/dece/derivaciones
- /api/dece/reportes/docentes
- /api/dece/violencia/protocolos
- /api/dece/nee

También se crean tablas internas si no existen, con nombre prefijado DECE para mantener un aislamiento del núcleo académico general.

### Frontend

Se reorganizó la interfaz en:
- frontend/dece.html

Incluye:
- sidebar con módulos;
- dashboard principal;
- módulos de gestión;
- formularios para cada bloque funcional;
- listas y resúmenes dinámicos.

La lógica de carga y render se centraliza en:
- frontend/assets/js/dece.js

### Permisos y roles

Se mantiene la autorización por roles y compatibilidad multirol.

Funcionamiento principal:
- usuario con rol PSICOLOGO puede acceder al DECE;
- usuario con rol ADMIN también puede acceder;
- la autenticación y autorización se gestionan con el middleware del sistema.

## 5. Archivos impactados

- backend/src/routes/dece.routes.js
- backend/tests/dece.test.js
- frontend/dece.html
- frontend/assets/js/dece.js

## 6. Validación realizada

Se ejecutó esta validación:

- node --test tests/dece.test.js tests/roles.test.js

Resultado verificado:
- 4 pruebas ejecutadas
- 4 aprobadas
- 0 fallidas

Esto confirma que la capa DECE y la lógica de roles siguen funcionando en conjunto.

## 7. Estado de cumplimiento por requisito

### Cumplido
- Gestión interna del DECE
- Derivaciones externas
- Reportes e informes para docentes
- Protocolos ante violencia
- NEE

### Observación importante

El sistema se ha construido con una base funcional sólida, pero siempre debe mantenerse una disciplina documental: cada bloque nuevo debe estar documentado en este archivo, en el índice general y en el módulo correspondiente cuando corresponda.

## 8. Bitácora

### 2026-09-16
- Se documenta la estructura del módulo DECE.
- Se define el orden correcto de requisitos.
- Se registra el estado funcional de cada bloque.
- Se deja evidencia de integración con backend, frontend y pruebas.
