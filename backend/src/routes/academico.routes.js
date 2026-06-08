/* ============================================================
   RUTAS ACADÉMICAS v2 — COLEGIO MIGUEL FEBRES CORDERO
   Archivo: backend/src/routes/academico.routes.js

   BD REAL: sistema_educativo — SIN crear tablas nuevas
   Tablas: calificaciones, tipos_evaluacion, trimestres,
           periodos_lectivos, materias, cursos, paralelos,
           docentes, tutorias, asignaciones_docente,
           matriculas, estudiantes, usuarios

   RELACIONES:
     matriculas      → estudiante_id, curso_id, paralelo_id, periodo_id
     asignaciones_d  → docente_id, materia_id, curso_id, paralelo_id, periodo_id
     calificaciones  → matricula_id, asignacion_id, trimestre_id, tipo_evaluacion_id, nota

   FÓRMULA:
     Actividades (todo excepto EXAMEN) → promedio × 70%
     EXAMEN → valor × 30%
     Nota trimestral = (prom_act × 0.70) + (examen × 0.30)
     Nota anual      = (T1 + T2 + T3) ÷ 3
   ============================================================ */

const express = require('express');
const pool    = require('../db');
const { authRequired, onlyAdmin } = require('../middlewares/auth');

const router = express.Router();

const adminOProfesor = (req, res, next) => {
    if (['ADMIN', 'SECRETARIA', 'PROFESOR'].includes(req.user.rol)) return next();
    return res.status(403).json({ error: 'Acceso restringido al personal docente' });
};

async function obtenerColumnasTabla(nombreTabla) {
    const permitidas = new Set(['asignaciones_docente']);
    if (!permitidas.has(nombreTabla)) throw new Error('Tabla no permitida');
    const [cols] = await pool.query(`SHOW COLUMNS FROM ${nombreTabla}`);
    return new Set(cols.map(col => col.Field));
}

async function obtenerConfigProfesorAsignacion() {
    const cols = await obtenerColumnasTabla('asignaciones_docente');
    if (cols.has('docente_id')) return { col: 'docente_id', tipo: 'docente' };
    if (cols.has('profesor_id')) return { col: 'profesor_id', tipo: 'usuario' };
    if (cols.has('usuario_id')) return { col: 'usuario_id', tipo: 'usuario' };
    if (cols.has('docente_usuario_id')) return { col: 'docente_usuario_id', tipo: 'usuario' };
    throw new Error('asignaciones_docente no tiene columna de profesor reconocida');
}

async function profesorPuedeAsignacion(user, asignacionId) {
    if (user.rol !== 'PROFESOR') return true;

    const cfg = await obtenerConfigProfesorAsignacion();
    const joinProfesor = cfg.tipo === 'docente'
        ? `JOIN docentes d ON d.id = ad.${cfg.col}`
        : '';
    const whereProfesor = cfg.tipo === 'docente'
        ? 'd.usuario_id = ?'
        : `ad.${cfg.col} = ?`;

    const [rows] = await pool.query(
        `SELECT ad.id
         FROM asignaciones_docente ad
         ${joinProfesor}
         WHERE ad.id = ? AND ${whereProfesor} AND ad.estado = 'ACTIVO'
         LIMIT 1`,
        [asignacionId, user.id]
    );
    return rows.length > 0;
}

async function profesorPuedeCurso(user, cursoId, paraleloId, periodoId) {
    if (user.rol !== 'PROFESOR') return true;

    const cfg = await obtenerConfigProfesorAsignacion();
    const joinProfesor = cfg.tipo === 'docente'
        ? `JOIN docentes d ON d.id = ad.${cfg.col}`
        : '';
    const whereProfesor = cfg.tipo === 'docente'
        ? 'd.usuario_id = ?'
        : `ad.${cfg.col} = ?`;

    const [rows] = await pool.query(
        `SELECT ad.id
         FROM asignaciones_docente ad
         ${joinProfesor}
         WHERE ad.curso_id = ? AND ad.paralelo_id = ? AND ad.periodo_id = ?
           AND ${whereProfesor} AND ad.estado = 'ACTIVO'
         LIMIT 1`,
        [cursoId, paraleloId, periodoId, user.id]
    );
    return rows.length > 0;
}

async function profesorPuedeMatricula(user, matriculaId) {
    if (user.rol !== 'PROFESOR') return true;

    const cfg = await obtenerConfigProfesorAsignacion();
    const joinProfesor = cfg.tipo === 'docente'
        ? `JOIN docentes d ON d.id = ad.${cfg.col}`
        : '';
    const whereProfesor = cfg.tipo === 'docente'
        ? 'd.usuario_id = ?'
        : `ad.${cfg.col} = ?`;

    const [rows] = await pool.query(
        `SELECT m.id
         FROM matriculas m
         JOIN asignaciones_docente ad
           ON ad.curso_id = m.curso_id
          AND ad.paralelo_id = m.paralelo_id
          AND ad.periodo_id = m.periodo_id
         ${joinProfesor}
         WHERE m.id = ? AND ${whereProfesor} AND ad.estado = 'ACTIVO'
         LIMIT 1`,
        [matriculaId, user.id]
    );
    return rows.length > 0;
}

async function matriculaPerteneceAsignacion(matriculaId, asignacionId) {
    const [rows] = await pool.query(
        `SELECT m.id
         FROM matriculas m
         JOIN asignaciones_docente ad
           ON ad.id = ?
          AND ad.curso_id = m.curso_id
          AND ad.paralelo_id = m.paralelo_id
          AND ad.periodo_id = m.periodo_id
         WHERE m.id = ?
         LIMIT 1`,
        [asignacionId, matriculaId]
    );
    return rows.length > 0;
}

function notaValida(nota) {
    const valor = Number(nota);
    return Number.isFinite(valor) && valor >= 0 && valor <= 10;
}

function normalizarTipoInsumo(tipo) {
    const value = String(tipo || '').trim().toUpperCase();
    const permitidos = new Set(['TAREA', 'LECCION', 'TALLER', 'INDIVIDUAL', 'APORTE']);
    return permitidos.has(value) ? value : null;
}

async function obtenerAsignacionDetalle(asignacionId) {
    const [rows] = await pool.query(
        `SELECT ad.id, ad.materia_id, ad.curso_id, ad.paralelo_id, ad.periodo_id,
                m.nombre AS materia, m.codigo AS materia_codigo,
                c.nombre AS curso, p.nombre AS paralelo
         FROM asignaciones_docente ad
         JOIN materias m ON m.id = ad.materia_id
         JOIN cursos c ON c.id = ad.curso_id
         JOIN paralelos p ON p.id = ad.paralelo_id
         WHERE ad.id = ? AND ad.estado = 'ACTIVO'
         LIMIT 1`,
        [asignacionId]
    );
    return rows[0] || null;
}

async function listarAlumnosAsignacion(asignacion) {
    const [alumnos] = await pool.query(
        `SELECT m.id AS matricula_id, e.id AS estudiante_id,
                e.cedula_est, e.nombres_est, e.apellidos_est
         FROM matriculas m
         JOIN estudiantes e ON e.id = m.estudiante_id
         WHERE m.curso_id = ? AND m.paralelo_id = ?
           AND m.periodo_id = ? AND m.estado IN ('ACTIVO','MATRICULADO')
         ORDER BY e.apellidos_est, e.nombres_est`,
        [asignacion.curso_id, asignacion.paralelo_id, asignacion.periodo_id]
    );
    return alumnos;
}

function calcularResumenAcademico(alumnos, parciales, examenes) {
    return alumnos.map(alumno => {
        const parcialesAlumno = parciales.map(parcial => {
            const notas = [];
            const porTipo = {};
            parcial.insumos.forEach(insumo => {
                const nota = insumo.notas[String(alumno.matricula_id)]?.nota;
                if (nota !== undefined && nota !== null) {
                    notas.push(Number(nota));
                    if (!porTipo[insumo.tipo]) porTipo[insumo.tipo] = [];
                    porTipo[insumo.tipo].push(Number(nota));
                }
            });
            const promedio = notas.length
                ? Number((notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(2))
                : null;
            return {
                parcial_id: parcial.id,
                nombre: parcial.nombre,
                estado: parcial.estado,
                promedio,
                por_tipo: Object.fromEntries(Object.entries(porTipo).map(([tipo, valores]) => [
                    tipo,
                    Number((valores.reduce((s, n) => s + n, 0) / valores.length).toFixed(2))
                ])),
            };
        });

        const promediosParciales = parcialesAlumno
            .map(p => p.promedio)
            .filter(v => v !== null && v !== undefined);
        const promedioParciales = promediosParciales.length
            ? Number((promediosParciales.reduce((s, n) => s + n, 0) / promediosParciales.length).toFixed(2))
            : null;
        const examen = examenes[String(alumno.matricula_id)]?.nota ?? null;
        const notaTrimestral = promedioParciales !== null
            ? Number(((promedioParciales * 0.70) + ((Number(examen) || 0) * 0.30)).toFixed(2))
            : null;

        return {
            ...alumno,
            parciales: parcialesAlumno,
            promedio_parciales: promedioParciales,
            examen_trimestral: examen,
            nota_trimestral: notaTrimestral,
        };
    });
}

/* ════════════════════════════════════
   1. CATÁLOGOS
   ════════════════════════════════════ */

// GET /api/academico/periodo-activo
router.get('/periodo-activo', authRequired, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, nombre, fecha_inicio, fecha_fin
             FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
        );
        if (!rows.length) return res.status(404).json({ error: 'No hay período lectivo activo' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el período activo' });
    }
});

// GET /api/academico/periodos
router.get('/periodos', authRequired, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, nombre, fecha_inicio, fecha_fin, estado
             FROM periodos_lectivos
             ORDER BY fecha_inicio DESC, id DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Error periodos:', err);
        res.status(500).json({ error: 'Error al obtener periodos lectivos' });
    }
});

// GET /api/academico/trimestres
router.get('/trimestres', authRequired, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, nombre, numero FROM trimestres ORDER BY numero`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener trimestres' });
    }
});

// GET /api/academico/tipos-evaluacion
router.get('/tipos-evaluacion', authRequired, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, codigo, nombre FROM tipos_evaluacion ORDER BY id`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener tipos de evaluación' });
    }
});

// GET /api/academico/materias
router.get('/materias', authRequired, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, codigo, nombre FROM materias WHERE estado = 'ACTIVO' ORDER BY nombre`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener materias' });
    }
});

// GET /api/academico/cursos-paralelos
router.get('/cursos-paralelos', authRequired, async (req, res) => {
    try {
        const [cursos] = await pool.query(
            `SELECT id, codigo, nombre, nivel FROM cursos WHERE estado = 'ACTIVO' ORDER BY orden`
        );
        const [paralelos] = await pool.query(
            `SELECT id, nombre FROM paralelos WHERE estado = 'ACTIVO' ORDER BY nombre`
        );
        res.json({ cursos, paralelos });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener cursos y paralelos' });
    }
});

/* ════════════════════════════════════
   2. ASIGNACIONES DOCENTE
   ════════════════════════════════════ */

// GET /api/academico/asignaciones?curso_id=X&paralelo_id=Y&periodo_id=Z
router.get('/asignaciones', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { curso_id, paralelo_id, periodo_id } = req.query;
        const cfg = await obtenerConfigProfesorAsignacion();
        const params = [];
        let where = `WHERE ad.estado = 'ACTIVO'`;
        if (periodo_id) { where += ' AND ad.periodo_id = ?';  params.push(periodo_id); }
        if (curso_id)   { where += ' AND ad.curso_id = ?';    params.push(curso_id); }
        if (paralelo_id){ where += ' AND ad.paralelo_id = ?'; params.push(paralelo_id); }
        if (req.user.rol === 'PROFESOR') {
            where += cfg.tipo === 'docente'
                ? ' AND d.usuario_id = ?'
                : ` AND ad.${cfg.col} = ?`;
            params.push(req.user.id);
        }

        const joinProfesor = cfg.tipo === 'docente'
            ? `JOIN docentes  d ON d.id = ad.${cfg.col}
               JOIN usuarios  u ON u.id = d.usuario_id`
            : `JOIN usuarios  u ON u.id = ad.${cfg.col}
               LEFT JOIN docentes d ON d.usuario_id = u.id`;

        const [rows] = await pool.query(
            `SELECT
               ad.id, ad.${cfg.col} AS docente_id, ad.materia_id,
               ad.curso_id, ad.paralelo_id, ad.periodo_id,
               m.nombre    AS materia,
               m.codigo    AS materia_codigo,
               c.nombre    AS curso,
               p.nombre    AS paralelo,
               u.nombres   AS docente_nombres,
               u.apellidos AS docente_apellidos
             FROM asignaciones_docente ad
             JOIN materias  m ON m.id = ad.materia_id
             JOIN cursos    c ON c.id = ad.curso_id
             JOIN paralelos p ON p.id = ad.paralelo_id
             ${joinProfesor}
             ${where}
             ORDER BY c.orden, m.nombre`,
            params
        );
        res.json(rows);
    } catch (err) {
        console.error('Error asignaciones:', err);
        res.status(500).json({ error: 'Error al obtener asignaciones' });
    }
});

/* ════════════════════════════════════
   3. NOTAS — GET con cálculo de promedio
   ════════════════════════════════════ */

// GET /api/academico/notas?asignacion_id=X&trimestre_id=Y
router.get('/notas', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { asignacion_id, trimestre_id } = req.query;
        if (asignacion_id && !(await profesorPuedeAsignacion(req.user, asignacion_id))) {
            return res.status(403).json({ error: 'No tienes permiso para esta asignacion' });
        }
        if (!asignacion_id || !trimestre_id)
            return res.status(400).json({ error: 'Faltan parámetros: asignacion_id, trimestre_id' });

        // Datos de la asignación
        const [asig] = await pool.query(
            `SELECT ad.*, m.nombre AS materia, c.nombre AS curso, p.nombre AS paralelo
             FROM asignaciones_docente ad
             JOIN materias  m ON m.id = ad.materia_id
             JOIN cursos    c ON c.id = ad.curso_id
             JOIN paralelos p ON p.id = ad.paralelo_id
             WHERE ad.id = ? LIMIT 1`,
            [asignacion_id]
        );
        if (!asig.length) return res.status(404).json({ error: 'Asignación no encontrada' });
        const a = asig[0];

        // Alumnos del curso/paralelo/periodo
        const [alumnos] = await pool.query(
            `SELECT
               m.id AS matricula_id,
               e.id AS estudiante_id,
               e.cedula_est, e.nombres_est, e.apellidos_est
             FROM matriculas m
             JOIN estudiantes e ON e.id = m.estudiante_id
             WHERE m.curso_id = ? AND m.paralelo_id = ?
               AND m.periodo_id = ? AND m.estado IN ('ACTIVO', 'MATRICULADO')
             ORDER BY e.apellidos_est, e.nombres_est`,
            [a.curso_id, a.paralelo_id, a.periodo_id]
        );

        if (!alumnos.length) return res.json({ asignacion: a, tipos: [], alumnos: [] });

        const matriculaIds = alumnos.map(al => al.matricula_id);

        // Calificaciones existentes
        const [califs] = await pool.query(
            `SELECT c.id, c.matricula_id, c.tipo_evaluacion_id,
                    c.nota, c.observacion,
                    te.codigo AS tipo_codigo, te.nombre AS tipo_nombre
             FROM calificaciones c
             JOIN tipos_evaluacion te ON te.id = c.tipo_evaluacion_id
             WHERE c.asignacion_id = ? AND c.trimestre_id = ?
               AND c.matricula_id IN (${matriculaIds.map(() => '?').join(',')})`,
            [asignacion_id, trimestre_id, ...matriculaIds]
        );

        // Tipos de evaluación
        const [tipos] = await pool.query(
            `SELECT id, codigo, nombre FROM tipos_evaluacion ORDER BY id`
        );
        const tipoExamen = tipos.find(t => t.codigo === 'EXAMEN');
        const tiposAct   = tipos.filter(t => t.codigo !== 'EXAMEN');

        // Mapa de notas por alumno
        const notasMap = {};
        califs.forEach(c => {
            if (!notasMap[c.matricula_id]) notasMap[c.matricula_id] = {};
            notasMap[c.matricula_id][c.tipo_evaluacion_id] = {
                id: c.id, nota: parseFloat(c.nota),
                observacion: c.observacion,
                tipo_codigo: c.tipo_codigo,
                tipo_nombre: c.tipo_nombre,
            };
        });

        const alumnosConNotas = alumnos.map(al => {
            const mis = notasMap[al.matricula_id] || {};
            const notasAct = tiposAct
                .map(t => mis[t.id]?.nota)
                .filter(v => v !== undefined && v !== null);
            const prom_act = notasAct.length
                ? parseFloat((notasAct.reduce((s, v) => s + v, 0) / notasAct.length).toFixed(2))
                : null;
            const examen = tipoExamen && mis[tipoExamen.id]
                ? parseFloat(mis[tipoExamen.id].nota) : null;
            const nota_trimestral = prom_act !== null
                ? parseFloat(((prom_act * 0.70) + ((examen || 0) * 0.30)).toFixed(2))
                : null;
            return { ...al, notas: mis, promedio_actividades: prom_act,
                     examen_trimestral: examen, nota_trimestral };
        });

        res.json({ asignacion: a, tipos, tipo_examen: tipoExamen || null, alumnos: alumnosConNotas });
    } catch (err) {
        console.error('Error notas:', err);
        res.status(500).json({ error: 'Error al obtener notas' });
    }
});

/* ════════════════════════════════════
   4. NOTAS — POST (UPSERT)
   ════════════════════════════════════ */

// POST /api/academico/notas
router.post('/notas', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { matricula_id, asignacion_id, trimestre_id,
                tipo_evaluacion_id, nota, observacion } = req.body;

        if (!matricula_id || !asignacion_id || !trimestre_id || !tipo_evaluacion_id || nota === undefined)
            return res.status(400).json({ error: 'Faltan campos obligatorios' });

        if (!(await profesorPuedeAsignacion(req.user, asignacion_id))) {
            return res.status(403).json({ error: 'No tienes permiso para esta asignacion' });
        }

        if (!(await matriculaPerteneceAsignacion(matricula_id, asignacion_id))) {
            return res.status(400).json({ error: 'La matricula no pertenece a esta asignacion' });
        }

        const v = parseFloat(nota);
        if (isNaN(v) || v < 0 || v > 10)
            return res.status(400).json({ error: 'La nota debe estar entre 0 y 10' });

        // UPSERT — si ya existe la combinación exacta, actualiza
        await pool.query(
            `INSERT INTO calificaciones
               (matricula_id, asignacion_id, trimestre_id, tipo_evaluacion_id, nota, observacion)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               nota        = VALUES(nota),
               observacion = VALUES(observacion)`,
            [matricula_id, asignacion_id, trimestre_id, tipo_evaluacion_id, v, observacion || null]
        );

        res.json({ success: true, message: 'Nota guardada ✅' });
    } catch (err) {
        console.error('Error guardar nota:', err);
        res.status(500).json({ error: 'Error al guardar la nota' });
    }
});

// DELETE /api/academico/notas/:id — solo admin
router.delete('/notas/:id', authRequired, onlyAdmin, async (req, res) => {
    try {
        const [r] = await pool.query('DELETE FROM calificaciones WHERE id = ?', [req.params.id]);
        if (!r.affectedRows) return res.status(404).json({ error: 'Calificación no encontrada' });
        res.json({ success: true, message: 'Nota eliminada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar la nota' });
    }
});

/* ════════════════════════════════════
   5. REPORTE INDIVIDUAL — /reporte/:matricula_id
      Usa vw_promedios_trimestrales si existe
   ════════════════════════════════════ */

// GET /api/academico/libro?asignacion_id=X&trimestre_id=Y
router.get('/libro', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { asignacion_id, trimestre_id } = req.query;
        if (!asignacion_id || !trimestre_id) {
            return res.status(400).json({ error: 'Faltan asignacion_id y trimestre_id' });
        }
        if (!(await profesorPuedeAsignacion(req.user, asignacion_id))) {
            return res.status(403).json({ error: 'No tienes permiso para esta asignacion' });
        }

        const asignacion = await obtenerAsignacionDetalle(asignacion_id);
        if (!asignacion) return res.status(404).json({ error: 'Asignacion no encontrada' });
        const alumnos = await listarAlumnosAsignacion(asignacion);

        const [trimestreRows] = await pool.query(
            'SELECT id, nombre, numero FROM trimestres WHERE id = ? LIMIT 1',
            [trimestre_id]
        );
        const [parcialRows] = await pool.query(
            `SELECT id, asignacion_id, trimestre_id, nombre, orden, estado, cerrado_at
             FROM academico_parciales
             WHERE asignacion_id = ? AND trimestre_id = ?
             ORDER BY orden ASC, id ASC`,
            [asignacion_id, trimestre_id]
        );

        const parcialIds = parcialRows.map(p => p.id);
        const insumosPorParcial = {};
        if (parcialIds.length) {
            const marks = parcialIds.map(() => '?').join(',');
            const [insumos] = await pool.query(
                `SELECT id, parcial_id, tipo, nombre, orden, estado
                 FROM academico_insumos
                 WHERE parcial_id IN (${marks}) AND estado = 'ACTIVO'
                 ORDER BY parcial_id, tipo, orden, id`,
                parcialIds
            );
            const insumoIds = insumos.map(i => i.id);
            const notasPorInsumo = {};
            if (insumoIds.length) {
                const insumoMarks = insumoIds.map(() => '?').join(',');
                const [notas] = await pool.query(
                    `SELECT id, insumo_id, matricula_id, nota, observacion
                     FROM academico_notas_insumos
                     WHERE insumo_id IN (${insumoMarks})`,
                    insumoIds
                );
                notas.forEach(n => {
                    if (!notasPorInsumo[n.insumo_id]) notasPorInsumo[n.insumo_id] = {};
                    notasPorInsumo[n.insumo_id][String(n.matricula_id)] = {
                        id: n.id,
                        nota: Number(n.nota),
                        observacion: n.observacion,
                    };
                });
            }
            insumos.forEach(i => {
                if (!insumosPorParcial[i.parcial_id]) insumosPorParcial[i.parcial_id] = [];
                insumosPorParcial[i.parcial_id].push({
                    ...i,
                    notas: notasPorInsumo[i.id] || {},
                });
            });
        }

        const [examenRows] = await pool.query(
            `SELECT id, matricula_id, nota, observacion
             FROM academico_examenes_trimestrales
             WHERE asignacion_id = ? AND trimestre_id = ?`,
            [asignacion_id, trimestre_id]
        );
        const examenes = {};
        examenRows.forEach(e => {
            examenes[String(e.matricula_id)] = {
                id: e.id,
                nota: Number(e.nota),
                observacion: e.observacion,
            };
        });

        const parciales = parcialRows.map(p => ({
            ...p,
            insumos: insumosPorParcial[p.id] || [],
        }));

        res.json({
            asignacion,
            trimestre: trimestreRows[0] || null,
            alumnos: calcularResumenAcademico(alumnos, parciales, examenes),
            parciales,
            examenes,
            formula: { parciales: 70, examen: 30 },
        });
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(501).json({ error: 'Falta ejecutar database/academico-parciales-insumos.sql en MySQL' });
        }
        console.error('Error libro academico:', err);
        res.status(500).json({ error: 'Error al cargar libro academico' });
    }
});

router.get('/parciales', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { asignacion_id, trimestre_id } = req.query;
        if (!asignacion_id || !trimestre_id) {
            return res.status(400).json({ error: 'Faltan asignacion_id y trimestre_id' });
        }
        if (!(await profesorPuedeAsignacion(req.user, asignacion_id))) {
            return res.status(403).json({ error: 'No tienes permiso para esta asignacion' });
        }

        const [rows] = await pool.query(
            `SELECT id, asignacion_id, trimestre_id, nombre, orden, estado, cerrado_at
             FROM academico_parciales
             WHERE asignacion_id = ? AND trimestre_id = ?
             ORDER BY orden ASC, id ASC`,
            [asignacion_id, trimestre_id]
        );

        res.json(rows);
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.status(501).json({ error: 'Falta ejecutar database/academico-parciales-insumos.sql en MySQL' });
        }
        console.error('Error listar parciales:', err);
        res.status(500).json({ error: 'Error al listar parciales' });
    }
});

router.post('/parciales', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { asignacion_id, trimestre_id, nombre } = req.body;
        if (!asignacion_id || !trimestre_id) return res.status(400).json({ error: 'Faltan datos del parcial' });
        if (!(await profesorPuedeAsignacion(req.user, asignacion_id))) {
            return res.status(403).json({ error: 'No tienes permiso para esta asignacion' });
        }

        const [ordenRows] = await pool.query(
            `SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente
             FROM academico_parciales
             WHERE asignacion_id = ? AND trimestre_id = ?`,
            [asignacion_id, trimestre_id]
        );
        const orden = Number(ordenRows[0]?.siguiente || 1);
        const parcialNombre = String(nombre || `PARCIAL ${orden}`).trim().toUpperCase().slice(0, 80);

        const [result] = await pool.query(
            'INSERT INTO academico_parciales (asignacion_id, trimestre_id, nombre, orden) VALUES (?, ?, ?, ?)',
            [asignacion_id, trimestre_id, parcialNombre, orden]
        );
        res.json({ success: true, id: result.insertId, nombre: parcialNombre, orden });
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') return res.status(501).json({ error: 'Falta ejecutar database/academico-parciales-insumos.sql en MySQL' });
        console.error('Error crear parcial:', err);
        res.status(500).json({ error: 'Error al crear parcial' });
    }
});

router.delete('/parciales/:id', authRequired, adminOProfesor, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const parcialId = Number(req.params.id);
        if (!parcialId) return res.status(400).json({ error: 'Parcial invalido' });

        const [rows] = await connection.query(
            `SELECT id, asignacion_id, nombre, orden
             FROM academico_parciales
             WHERE id = ?
             LIMIT 1`,
            [parcialId]
        );

        if (!rows.length) return res.status(404).json({ error: 'Parcial no encontrado' });

        const parcial = rows[0];
        if (!(await profesorPuedeAsignacion(req.user, parcial.asignacion_id))) {
            return res.status(403).json({ error: 'No tienes permiso para este parcial' });
        }

        if (Number(parcial.orden) <= 2) {
            return res.status(400).json({ error: 'PARCIAL 1 y PARCIAL 2 son obligatorios y no se pueden eliminar' });
        }

        await connection.beginTransaction();

        await connection.query(
            `DELETE n
             FROM academico_notas_insumos n
             JOIN academico_insumos i ON i.id = n.insumo_id
             WHERE i.parcial_id = ?`,
            [parcialId]
        );

        await connection.query(
            `DELETE FROM academico_insumos
             WHERE parcial_id = ?`,
            [parcialId]
        );

        await connection.query(
            `DELETE FROM academico_parciales
             WHERE id = ?`,
            [parcialId]
        );

        await connection.commit();
        res.json({ success: true, message: `Parcial eliminado: ${parcial.nombre}` });
    } catch (err) {
        await connection.rollback();
        if (err.code === 'ER_NO_SUCH_TABLE') return res.status(501).json({ error: 'Falta ejecutar database/academico-parciales-insumos.sql en MySQL' });
        console.error('Error eliminar parcial:', err);
        res.status(500).json({ error: 'Error al eliminar parcial' });
    } finally {
        connection.release();
    }
});

router.patch('/parciales/:id/estado', authRequired, adminOProfesor, async (req, res) => {
    try {
        const estado = String(req.body.estado || '').toUpperCase();
        if (!['ABIERTO', 'CERRADO'].includes(estado)) return res.status(400).json({ error: 'Estado invalido' });
        const [rows] = await pool.query('SELECT id, asignacion_id FROM academico_parciales WHERE id = ? LIMIT 1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Parcial no encontrado' });
        if (!(await profesorPuedeAsignacion(req.user, rows[0].asignacion_id))) {
            return res.status(403).json({ error: 'No tienes permiso para este parcial' });
        }
        await pool.query(
            `UPDATE academico_parciales
             SET estado = ?, cerrado_por = ?, cerrado_at = ${estado === 'CERRADO' ? 'NOW()' : 'NULL'}
             WHERE id = ?`,
            [estado, estado === 'CERRADO' ? req.user.id : null, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error cambiar parcial:', err);
        res.status(500).json({ error: 'Error al cambiar estado del parcial' });
    }
});

router.post('/insumos', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { parcial_id, tipo, nombre } = req.body;
        const tipoFinal = normalizarTipoInsumo(tipo);
        if (!parcial_id || !tipoFinal) return res.status(400).json({ error: 'Faltan datos del insumo' });
        const [parcialRows] = await pool.query('SELECT id, asignacion_id, estado FROM academico_parciales WHERE id = ? LIMIT 1', [parcial_id]);
        if (!parcialRows.length) return res.status(404).json({ error: 'Parcial no encontrado' });
        if (parcialRows[0].estado === 'CERRADO' && req.user.rol !== 'ADMIN') return res.status(403).json({ error: 'El parcial esta cerrado' });
        if (!(await profesorPuedeAsignacion(req.user, parcialRows[0].asignacion_id))) {
            return res.status(403).json({ error: 'No tienes permiso para este parcial' });
        }
        const [ordenRows] = await pool.query(
            'SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM academico_insumos WHERE parcial_id = ? AND tipo = ?',
            [parcial_id, tipoFinal]
        );
        const orden = ordenRows[0]?.siguiente || 1;
        const insumoNombre = String(nombre || `${tipoFinal} ${orden}`).trim().slice(0, 120);
        const [result] = await pool.query(
            'INSERT INTO academico_insumos (parcial_id, tipo, nombre, orden) VALUES (?, ?, ?, ?)',
            [parcial_id, tipoFinal, insumoNombre, orden]
        );
        res.json({ success: true, id: result.insertId, nombre: insumoNombre, tipo: tipoFinal, orden });
    } catch (err) {
        console.error('Error crear insumo:', err);
        res.status(500).json({ error: 'Error al crear insumo' });
    }
});

router.delete('/insumos/:id', authRequired, adminOProfesor, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const insumoId = Number(req.params.id);
        if (!insumoId) return res.status(400).json({ error: 'Insumo invalido' });

        const [rows] = await connection.query(
            `SELECT i.id, i.nombre, i.tipo, i.estado, i.parcial_id,
                    p.asignacion_id, p.estado AS parcial_estado
             FROM academico_insumos i
             JOIN academico_parciales p ON p.id = i.parcial_id
             WHERE i.id = ?
             LIMIT 1`,
            [insumoId]
        );

        if (!rows.length) return res.status(404).json({ error: 'Insumo no encontrado' });

        const insumo = rows[0];
        if (!(await profesorPuedeAsignacion(req.user, insumo.asignacion_id))) {
            return res.status(403).json({ error: 'No tienes permiso para este insumo' });
        }

        if (insumo.parcial_estado === 'CERRADO' && req.user.rol !== 'ADMIN') {
            return res.status(403).json({ error: 'El parcial esta cerrado, no se puede eliminar el insumo' });
        }

        await connection.beginTransaction();

        await connection.query(
            'DELETE FROM academico_notas_insumos WHERE insumo_id = ?',
            [insumoId]
        );

        await connection.query(
            'DELETE FROM academico_insumos WHERE id = ?',
            [insumoId]
        );

        await connection.commit();
        res.json({ success: true, message: `Insumo eliminado: ${insumo.nombre}` });
    } catch (err) {
        await connection.rollback();
        console.error('Error eliminar insumo:', err);
        res.status(500).json({ error: 'Error al eliminar insumo' });
    } finally {
        connection.release();
    }
});

router.post('/notas-insumo', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { insumo_id, matricula_id, nota, observacion } = req.body;
        if (!insumo_id || !matricula_id || nota === undefined) return res.status(400).json({ error: 'Faltan datos de nota' });
        if (!notaValida(nota)) return res.status(400).json({ error: 'La nota debe estar entre 0 y 10' });
        const [rows] = await pool.query(
            `SELECT i.id, p.asignacion_id, p.estado
             FROM academico_insumos i
             JOIN academico_parciales p ON p.id = i.parcial_id
             WHERE i.id = ? AND i.estado = 'ACTIVO'
             LIMIT 1`,
            [insumo_id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Insumo no encontrado' });
        if (rows[0].estado === 'CERRADO' && req.user.rol !== 'ADMIN') return res.status(403).json({ error: 'El parcial esta cerrado' });
        if (!(await profesorPuedeAsignacion(req.user, rows[0].asignacion_id))) return res.status(403).json({ error: 'No tienes permiso para este insumo' });
        if (!(await matriculaPerteneceAsignacion(matricula_id, rows[0].asignacion_id))) return res.status(400).json({ error: 'La matricula no pertenece a esta asignacion' });
        await pool.query(
            `INSERT INTO academico_notas_insumos (insumo_id, matricula_id, nota, observacion, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE nota = VALUES(nota), observacion = VALUES(observacion), updated_by = VALUES(updated_by)`,
            [insumo_id, matricula_id, Number(nota), observacion || null, req.user.id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error guardar nota insumo:', err);
        res.status(500).json({ error: 'Error al guardar nota de insumo' });
    }
});

router.post('/examen-trimestral', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { asignacion_id, trimestre_id, matricula_id, nota, observacion } = req.body;
        if (!asignacion_id || !trimestre_id || !matricula_id || nota === undefined) return res.status(400).json({ error: 'Faltan datos del examen' });
        if (!notaValida(nota)) return res.status(400).json({ error: 'La nota debe estar entre 0 y 10' });
        if (!(await profesorPuedeAsignacion(req.user, asignacion_id))) return res.status(403).json({ error: 'No tienes permiso para esta asignacion' });
        if (!(await matriculaPerteneceAsignacion(matricula_id, asignacion_id))) return res.status(400).json({ error: 'La matricula no pertenece a esta asignacion' });
        await pool.query(
            `INSERT INTO academico_examenes_trimestrales (asignacion_id, trimestre_id, matricula_id, nota, observacion, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE nota = VALUES(nota), observacion = VALUES(observacion), updated_by = VALUES(updated_by)`,
            [asignacion_id, trimestre_id, matricula_id, Number(nota), observacion || null, req.user.id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error guardar examen:', err);
        res.status(500).json({ error: 'Error al guardar examen trimestral' });
    }
});

router.post('/nota-unica', authRequired, adminOProfesor, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { parcial_id, asignacion_id, trimestre_id, insumo_id, alcance, nota } = req.body;
        if (!notaValida(nota)) return res.status(400).json({ error: 'La nota debe estar entre 0 y 10' });
        let asignacionId = asignacion_id;
        let trimestreId = trimestre_id;
        let insumoIds = [];
        if (insumo_id) {
            const [rows] = await connection.query(
                `SELECT i.id, p.asignacion_id, p.trimestre_id, p.estado
                 FROM academico_insumos i JOIN academico_parciales p ON p.id = i.parcial_id
                 WHERE i.id = ? LIMIT 1`,
                [insumo_id]
            );
            if (!rows.length) return res.status(404).json({ error: 'Insumo no encontrado' });
            if (rows[0].estado === 'CERRADO' && req.user.rol !== 'ADMIN') return res.status(403).json({ error: 'El parcial esta cerrado' });
            asignacionId = rows[0].asignacion_id;
            trimestreId = rows[0].trimestre_id;
            insumoIds = [rows[0].id];
        } else if (parcial_id) {
            const [rows] = await connection.query('SELECT id, asignacion_id, trimestre_id, estado FROM academico_parciales WHERE id = ? LIMIT 1', [parcial_id]);
            if (!rows.length) return res.status(404).json({ error: 'Parcial no encontrado' });
            if (rows[0].estado === 'CERRADO' && req.user.rol !== 'ADMIN') return res.status(403).json({ error: 'El parcial esta cerrado' });
            asignacionId = rows[0].asignacion_id;
            trimestreId = rows[0].trimestre_id;
            const [ins] = await connection.query('SELECT id FROM academico_insumos WHERE parcial_id = ? AND estado = ?',[parcial_id, 'ACTIVO']);
            insumoIds = ins.map(i => i.id);
        }
        if (!asignacionId || !trimestreId) return res.status(400).json({ error: 'Falta contexto academico' });
        if (!(await profesorPuedeAsignacion(req.user, asignacionId))) return res.status(403).json({ error: 'No tienes permiso para esta asignacion' });
        const asignacion = await obtenerAsignacionDetalle(asignacionId);
        const alumnos = await listarAlumnosAsignacion(asignacion);
        await connection.beginTransaction();
        if (alcance === 'EXAMEN') {
            for (const alumno of alumnos) {
                await connection.query(
                    `INSERT INTO academico_examenes_trimestrales (asignacion_id, trimestre_id, matricula_id, nota, created_by, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE nota = VALUES(nota), updated_by = VALUES(updated_by)`,
                    [asignacionId, trimestreId, alumno.matricula_id, Number(nota), req.user.id, req.user.id]
                );
            }
        } else {
            if (!insumoIds.length) return res.status(400).json({ error: 'No hay insumos para aplicar nota unica' });
            for (const insumoId of insumoIds) {
                for (const alumno of alumnos) {
                    await connection.query(
                        `INSERT INTO academico_notas_insumos (insumo_id, matricula_id, nota, created_by, updated_by)
                         VALUES (?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE nota = VALUES(nota), updated_by = VALUES(updated_by)`,
                        [insumoId, alumno.matricula_id, Number(nota), req.user.id, req.user.id]
                    );
                }
            }
        }
        await connection.commit();
        res.json({ success: true, alumnos: alumnos.length });
    } catch (err) {
        await connection.rollback();
        console.error('Error nota unica:', err);
        res.status(500).json({ error: 'Error al aplicar nota unica' });
    } finally {
        connection.release();
    }
});

router.get('/reporte/:matricula_id', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { matricula_id } = req.params;

        if (!(await profesorPuedeMatricula(req.user, matricula_id))) {
            return res.status(403).json({ error: 'No tienes permiso para esta matricula' });
        }

        const [mat] = await pool.query(
            `SELECT m.id AS matricula_id, m.periodo_id, m.curso_id, m.paralelo_id,
                    e.id AS estudiante_id, e.cedula_est, e.nombres_est, e.apellidos_est,
                    c.nombre AS curso, p.nombre AS paralelo, pl.nombre AS periodo
             FROM matriculas m
             JOIN estudiantes     e  ON e.id  = m.estudiante_id
             JOIN cursos          c  ON c.id  = m.curso_id
             JOIN paralelos       p  ON p.id  = m.paralelo_id
             JOIN periodos_lectivos pl ON pl.id = m.periodo_id
             WHERE m.id = ? LIMIT 1`,
            [matricula_id]
        );
        if (!mat.length) return res.status(404).json({ error: 'Matrícula no encontrada' });
        const alumno = mat[0];

        // Calcular en vivo desde calificaciones
        const [califs] = await pool.query(
            `SELECT
               c.asignacion_id,
               c.trimestre_id,
               t.nombre   AS trimestre_nombre,
               t.numero   AS trimestre_num,
               te.codigo  AS tipo_codigo,
               c.nota,
               ma.id      AS materia_id,
               ma.nombre  AS materia
             FROM calificaciones c
             JOIN trimestres           t  ON t.id  = c.trimestre_id
             JOIN tipos_evaluacion     te ON te.id = c.tipo_evaluacion_id
             JOIN asignaciones_docente ad ON ad.id = c.asignacion_id
             JOIN materias             ma ON ma.id = ad.materia_id
             WHERE c.matricula_id = ?
             ORDER BY ma.nombre, t.numero`,
            [matricula_id]
        );

        // Agrupar por materia → trimestre
        const materiasMap = {};
        califs.forEach(row => {
            if (!materiasMap[row.materia_id]) {
                materiasMap[row.materia_id] = {
                    materia_id: row.materia_id,
                    materia:    row.materia,
                    trimestres: {},
                };
            }
            if (!materiasMap[row.materia_id].trimestres[row.trimestre_num]) {
                materiasMap[row.materia_id].trimestres[row.trimestre_num] = {
                    nombre: row.trimestre_nombre,
                    notas_act: [], examen: null,
                };
            }
            const trim = materiasMap[row.materia_id].trimestres[row.trimestre_num];
            if (row.tipo_codigo === 'EXAMEN') {
                trim.examen = parseFloat(row.nota);
            } else {
                trim.notas_act.push(parseFloat(row.nota));
            }
        });

        const resultado = Object.values(materiasMap).map(mat => {
            const trimestres = {};
            Object.entries(mat.trimestres).forEach(([num, trim]) => {
                const prom_act = trim.notas_act.length
                    ? parseFloat((trim.notas_act.reduce((s,v) => s+v, 0) / trim.notas_act.length).toFixed(2))
                    : null;
                const nota_trimestral = prom_act !== null
                    ? parseFloat(((prom_act * 0.70) + ((trim.examen || 0) * 0.30)).toFixed(2))
                    : null;
                trimestres[num] = {
                    nombre: trim.nombre,
                    promedio_actividades: prom_act,
                    examen: trim.examen,
                    nota_trimestral,
                };
            });
            const trims = Object.values(trimestres).map(t => t.nota_trimestral).filter(v => v !== null);
            const promedio_anual = trims.length
                ? parseFloat((trims.reduce((s,v) => s+v, 0) / trims.length).toFixed(2))
                : null;
            return { ...mat, trimestres, promedio_anual };
        });

        res.json({ alumno, materias: resultado });
    } catch (err) {
        console.error('Error reporte:', err);
        res.status(500).json({ error: 'Error al generar el reporte' });
    }
});

/* ════════════════════════════════════
   6. RESUMEN CURSO — para la tabla general
   ════════════════════════════════════ */

// GET /api/academico/resumen-curso?curso_id=X&paralelo_id=Y&periodo_id=Z&trimestre_id=W
router.get('/resumen-curso', authRequired, adminOProfesor, async (req, res) => {
    try {
        const { curso_id, paralelo_id, periodo_id, trimestre_id } = req.query;
        if (curso_id && paralelo_id && periodo_id && !(await profesorPuedeCurso(req.user, curso_id, paralelo_id, periodo_id))) {
            return res.status(403).json({ error: 'No tienes permiso para este curso' });
        }
        if (!curso_id || !paralelo_id || !periodo_id)
            return res.status(400).json({ error: 'Faltan parámetros' });

        const [alumnos] = await pool.query(
            `SELECT m.id AS matricula_id, e.id AS estudiante_id,
                    e.cedula_est, e.nombres_est, e.apellidos_est
             FROM matriculas m
             JOIN estudiantes e ON e.id = m.estudiante_id
             WHERE m.curso_id = ? AND m.paralelo_id = ?
               AND m.periodo_id = ? AND m.estado IN ('ACTIVO', 'MATRICULADO')
             ORDER BY e.apellidos_est, e.nombres_est`,
            [curso_id, paralelo_id, periodo_id]
        );

        if (!alumnos.length) return res.json([]);

        if (trimestre_id) {
            const matriculaIds = alumnos.map(a => a.matricula_id);
            const [califs] = await pool.query(
                `SELECT c.matricula_id, te.codigo AS tipo_codigo, c.nota
                 FROM calificaciones c
                 JOIN tipos_evaluacion te ON te.id = c.tipo_evaluacion_id
                 WHERE c.trimestre_id = ?
                   AND c.matricula_id IN (${matriculaIds.map(() => '?').join(',')})`,
                [trimestre_id, ...matriculaIds]
            );
            const calMap = {};
            califs.forEach(c => {
                if (!calMap[c.matricula_id]) calMap[c.matricula_id] = [];
                calMap[c.matricula_id].push(c);
            });
            return res.json(alumnos.map(al => {
                const mis  = calMap[al.matricula_id] || [];
                const act  = mis.filter(c => c.tipo_codigo !== 'EXAMEN').map(c => parseFloat(c.nota));
                const exam = mis.find(c => c.tipo_codigo === 'EXAMEN');
                const prom_act = act.length
                    ? parseFloat((act.reduce((s,v) => s+v, 0) / act.length).toFixed(2)) : null;
                const examen = exam ? parseFloat(exam.nota) : null;
                const nota_trimestral = prom_act !== null
                    ? parseFloat(((prom_act * 0.70) + ((examen || 0) * 0.30)).toFixed(2)) : null;
                return { ...al, promedio_actividades: prom_act, examen_trimestral: examen, nota_trimestral };
            }));
        }

        res.json(alumnos);
    } catch (err) {
        console.error('Error resumen-curso:', err);
        res.status(500).json({ error: 'Error al obtener resumen del curso' });
    }
});

module.exports = router;
