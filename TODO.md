# TODO - Auditoría completa de base de datos

## Estado
- [ ] 1. Inventariar tablas reales (fuente: SQLs del repo + referencias en código backend).
- [ ] 2. Mapear tablas usadas por el programa (endpoint/archivo + lectura/escritura).
- [ ] 3. Clasificar tablas: uso correcto, uso riesgoso/mix, legado/no usadas.
- [ ] 4. Recomendar por tabla: mantener, migrar/archivar, eliminar (con motivo).
- [ ] 5. Crear documento formal en `docs/` con plan por fases y checklist de respaldo.
- [ ] 6. Actualizar `docs/funcionamiento-sistema.md` con fecha y resumen de la auditoría.

## Notas de implementación
- No eliminar tablas directamente desde código ni SQL sin respaldo previo.
- Marcar claramente qué recomendaciones requieren validación de datos históricos.
- Incluir matriz tabla ↔ endpoint para que el equipo sepa impacto real.
