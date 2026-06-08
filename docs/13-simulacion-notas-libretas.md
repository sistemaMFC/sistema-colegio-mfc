# Simulacion de notas y libretas

Fecha: 2026-06-08

## Objetivo

La seccion `Simulacion` del portal profesor permite revisar visualmente como se
comportan las notas antes de guardar datos reales en la base.

Sirve para probar:

- mas de 10 notas por estudiante,
- tareas,
- lecciones,
- actividades en clase,
- actividades grupales,
- pruebas/aportes,
- examen trimestral separado,
- promedio de parciales,
- nota final trimestral,
- vista de libreta imprimible como PDF.

## Ubicacion

Archivo principal:

- `frontend/assets/js/profesor-academico.js`

Vista:

- `frontend/profesor-academico.html`

Entrada visible:

- Portal Profesor
- Academico
- `Simulacion`

## Reglas de calculo simuladas

1. Cada parcial tiene varios insumos.
2. Los insumos del parcial se promedian.
3. Los parciales se promedian entre si.
4. El promedio de parciales vale 70%.
5. El examen trimestral vale 30%.
6. El examen trimestral no pertenece a ningun parcial.

Formula:

```text
nota_final_trimestre = promedio_parciales * 0.70 + examen_trimestral * 0.30
```

## Datos reales

La simulacion no guarda datos en MySQL.
No modifica estudiantes, matriculas, parciales, insumos ni calificaciones reales.

## Libreta PDF

El boton `Ver / imprimir PDF` abre una ventana imprimible con la libreta
simulada. Desde el navegador se puede guardar como PDF.

## Bitacora

- 2026-06-08: se crea documentacion inicial del apartado de simulacion de notas y libretas.
