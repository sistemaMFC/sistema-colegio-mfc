# TODO - Ver/Eliminar insumos (Profesor/Admin)

## Estado
- [x] 1. Backend: agregar `DELETE /api/academico/insumos/:id` con validación de permisos y estado del parcial.
- [x] 2. Frontend Profesor: sección "Ver insumos" (lista de creados) + botón eliminar con confirmación.
- [x] 3. Frontend Admin: sección equivalente "Ver insumos" + eliminar con confirmación.
- [x] 4. Documentación: registrar cambios con fecha en `docs/funcionamiento-sistema.md`.
- [ ] 5. Prueba rápida: eliminar insumo y refrescar vista sin romper libro de notas.

## Notas de implementación
- La eliminación debe bloquearse si el parcial está cerrado.
- Se deben eliminar primero notas hijas (`academico_notas_insumos`) y luego el insumo.
- Solo ADMIN/SECRETARIA o profesor dueño de la asignación pueden eliminar.
