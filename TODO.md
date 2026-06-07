# TODO - Reorganización académica Profesor/Admin (Periodo → Trimestre → Parcial → Insumos)

## Estado
- [x] 1. Backend académico: periodos, parciales por contexto, eliminación de parciales opcionales
- [x] 2. Frontend Profesor: selector periodo + trimestre, chips de parciales, botón [+], tachito en parciales 3+
- [ ] 3. Frontend Admin Académico: misma estructura académica que profesor (con permisos de admin)
- [ ] 4. Documentación: registrar cambios con fecha en docs/funcionamiento-sistema.md
- [ ] 5. Validación de sintaxis (node --check) en archivos modificados

## Notas de implementación
- PARCIAL 1 y PARCIAL 2 obligatorios y no eliminables.
- PARCIAL 3+ eliminables con confirmación.
- Examen trimestral siempre separado de insumos.
- Filtros de contexto: asignación + periodo + trimestre.
