# Índice de Documentación Técnica — Sistema Colegio MFC

Fecha: 2026-06-07

Este índice organiza la documentación funcional, técnica y estratégica del sistema para uso interno y para otras IA (contexto de entrada rápido y ordenado).

## Documentos por módulo / tema

1. `01-resumen-general-sistema.md`  
   Visión global del sistema, arquitectura, módulos, flujos y estado actual.

2. `02-frontend-documentacion.md`  
   Estructura frontend, pantallas, componentes, flujos de usuario y puntos críticos UX.

3. `03-backend-documentacion-ampliada.md`  
   Arquitectura backend, rutas, middlewares, controladores, riesgos técnicos y mejoras sugeridas.

4. `04-base-datos-documentacion.md`  
   Modelo de datos actual, tablas oficiales, tablas legacy, integridad y riesgos de esquema.

5. `05-modulo-academico-insumos-notas.md`  
   Funcionamiento actual del módulo académico, fortalezas, debilidades y roadmap.

6. `06-modulo-asistencia.md`  
   Diseño y funcionamiento de asistencia (profesor/admin), estado actual y faltantes.

7. `07-modulo-matriculas-enrollments.md`  
   Flujo de matrículas, distribución y asignación manual, validaciones y pendientes.

8. `08-modulo-estudiantes-usuarios-auth.md`  
   Gestión de estudiantes, usuarios, autenticación/autorización, seguridad y brechas.

9. `09-modulo-pagos.md`  
   Situación del módulo de pagos, modelo híbrido actual y plan recomendado de cierre.

10. `10-errores-riesgos-y-deuda-tecnica.md`  
    Consolidado de problemas detectados, impacto y priorización de corrección.

11. `11-roadmap-mejoras-recomendadas.md`  
    Plan de mejora por fases (corto, medio y largo plazo), con criterios de éxito.

12. `12-guia-contexto-para-otras-ias.md`  
    Documento de onboarding técnico para IA: contexto, reglas, rutas clave y tareas sugeridas.

13. `13-simulacion-notas-libretas.md`
    Simulacion de notas, parciales, examen trimestral separado y libreta imprimible/PDF.

## Documentos existentes relacionados

- `funcionamiento-sistema.md`
- `backend-documentacion.md`

## Convención recomendada

- Mantener fecha en cada documento.
- Registrar cambios importantes al final de cada archivo en sección “Bitácora”.
- Cuando se haga una corrección funcional, actualizar:
  - documento del módulo afectado
  - documento de riesgos/deuda
  - resumen general
