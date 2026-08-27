/* ============================================================
   RUTAS PORTAL PROFESOR — COLEGIO MFC
   Archivo: backend/src/routes/profesor.routes.js
   Registrar en server.js:
     app.use('/api/profesor', require('./routes/profesor.routes'));
   ============================================================ */
const express = require('express');
const pool    = require('../db');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

const soloDocente = (req, res, next) => {
    if (['ADMIN', 'SECRETARIA', 'PROFESOR'].includes(req.user.rol)) return next();
    return res.status(403).json({ error: 'Acceso restringido al personal docente' });
};

async function obtenerColumnasTabla(nombreTabla) {
    const permitidas = new Set(['asignaciones_docente', 'matriculas']);
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

async function obtenerPeriodoActivo() {
    const [periodo] = await pool.query(
        `SELECT id, nombre FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
    );
    return periodo[0] || null;
}

/* ── GET /api/profesor/mi-docente ──────────────────────────────
   Devuelve: datos del docente + sus asignaciones + sus tutorias
   El portal del profesor usa esto para construir toda la UI.
   ──────────────────────────────────────────────────────────── */
router.get('/mi-docente', authRequired, soloDocente, async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const cfg = await obtenerConfigProfesorAsignacion();

        // Datos del docente
        const [docRows] = await pool.query(
            `SELECT d.id, d.usuario_id, d.cedula, d.estado,
                    u.nombres, u.apellidos
             FROM docentes d
             JOIN usuarios u ON u.id = d.usuario_id
             WHERE d.usuario_id = ? AND d.estado = 'ACTIVO' LIMIT 1`,
            [usuarioId]
        );
        const docente = docRows[0] || { usuario_id: usuarioId, id: null };

        let asignaciones = [], tutorias = [];

        if (docente.id || cfg.tipo === 'usuario' || req.user.rol === 'ADMIN') {
            const [periodo] = await pool.query(
                `SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
            );
            const periodoId = periodo[0]?.id;

            if (periodoId) {
                const profesorValor = cfg.tipo === 'docente' ? docente.id : usuarioId;
                const [asig] = await pool.query(
                    `SELECT ad.id, ad.materia_id, ad.curso_id, ad.paralelo_id,
                            m.nombre AS materia, m.codigo AS materia_codigo,
                            c.nombre AS curso, p.nombre AS paralelo,
                            u.nombres AS docente_nombres, u.apellidos AS docente_apellidos
                     FROM asignaciones_docente ad
                     JOIN materias  m ON m.id = ad.materia_id
                     JOIN cursos    c ON c.id = ad.curso_id
                     JOIN paralelos p ON p.id = ad.paralelo_id
                     ${cfg.tipo === 'docente'
                        ? `LEFT JOIN docentes d ON d.id = ad.${cfg.col} LEFT JOIN usuarios u ON u.id = d.usuario_id`
                        : `LEFT JOIN usuarios u ON u.id = ad.${cfg.col}`}
                     WHERE ad.${cfg.col} = ?
                       AND ad.periodo_id = ?
                       AND ad.estado = 'ACTIVO'
                     ORDER BY c.nombre, m.nombre`,
                    [profesorValor, periodoId]
                );
                asignaciones = asig;

                const [tut] = await pool.query(
                    `SELECT t.id, t.curso_id, t.paralelo_id,
                            c.nombre AS curso, p.nombre AS paralelo
                     FROM tutorias t
                     JOIN cursos    c ON c.id = t.curso_id
                     JOIN paralelos p ON p.id = t.paralelo_id
                     WHERE t.docente_usuario_id = ? AND t.periodo_id = ? AND t.estado = 'ACTIVO'`,
                    [usuarioId, periodoId]
                );
                tutorias = tut;
            }
        }

        res.json({ docente, asignaciones, tutorias });
    } catch (err) {
        console.error('Error mi-docente:', err);
        res.status(500).json({ error: 'Error al cargar datos del docente' });
    }
});

/* ── GET /api/profesor/perfil ── */
router.get('/materias', authRequired, soloDocente, async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const cfg = await obtenerConfigProfesorAsignacion();
        const periodo = await obtenerPeriodoActivo();
        if (!periodo?.id) return res.json([]);

        const filtroProfesor = cfg.tipo === 'docente'
            ? 'd.usuario_id = ?'
            : `ad.${cfg.col} = ?`;
        const params = [usuarioId, periodo.id];

        const joinProfesor = cfg.tipo === 'docente'
            ? `LEFT JOIN docentes d ON d.id = ad.${cfg.col}
               LEFT JOIN usuarios u ON u.id = d.usuario_id`
            : `LEFT JOIN usuarios u ON u.id = ad.${cfg.col}
               LEFT JOIN docentes d ON d.usuario_id = u.id`;
        const [adCols, matCols] = await Promise.all([
            obtenerColumnasTabla('asignaciones_docente'),
            obtenerColumnasTabla('matriculas')
        ]);
        const tieneEspecialidad = adCols.has('especialidad_id');
        const filtrarEspecialidad = tieneEspecialidad && matCols.has('especialidad_id');
        const selectEspecialidad = tieneEspecialidad ? 'ad.especialidad_id' : 'NULL AS especialidad_id';
        const joinEspecialidad = tieneEspecialidad ? 'LEFT JOIN especialidades esp ON esp.id = ad.especialidad_id' : '';
        const selectEspecialidadNombre = tieneEspecialidad ? 'esp.nombre AS especialidad' : 'NULL AS especialidad';
        const filtroEspecialidadMatricula = filtrarEspecialidad
            ? 'AND (ad.especialidad_id IS NULL OR mt.especialidad_id = ad.especialidad_id)'
            : '';

        const [rows] = await pool.query(
            `SELECT
                ad.id AS asignacion_id,
                ad.id,
                ad.materia_id,
                m.nombre AS materia_nombre,
                m.nombre AS materia,
                m.codigo AS materia_codigo,
                ad.curso_id,
                c.nombre AS curso_nombre,
                c.nombre AS curso,
                ad.paralelo_id,
                p.nombre AS paralelo,
                ${selectEspecialidad},
                ${selectEspecialidadNombre},
                ad.periodo_id,
                pl.nombre AS periodo_nombre,
                u.nombres AS docente_nombres,
                u.apellidos AS docente_apellidos,
                COUNT(mt.id) AS total_estudiantes
             FROM asignaciones_docente ad
             JOIN materias m ON m.id = ad.materia_id
             JOIN cursos c ON c.id = ad.curso_id
             JOIN paralelos p ON p.id = ad.paralelo_id
             JOIN periodos_lectivos pl ON pl.id = ad.periodo_id
             ${joinEspecialidad}
             ${joinProfesor}
             LEFT JOIN matriculas mt
                    ON mt.curso_id = ad.curso_id
                   AND mt.paralelo_id = ad.paralelo_id
                   AND mt.periodo_id = ad.periodo_id
                   AND mt.estado IN ('ACTIVO','MATRICULADO')
                   ${filtroEspecialidadMatricula}
             WHERE ${filtroProfesor}
               AND ad.periodo_id = ?
               AND ad.estado = 'ACTIVO'
             GROUP BY ad.id, ad.materia_id, m.nombre, m.codigo, ad.curso_id,
                      c.nombre, ad.paralelo_id, p.nombre, ${tieneEspecialidad ? 'ad.especialidad_id, esp.nombre,' : ''}
                      ad.periodo_id, pl.nombre, u.nombres, u.apellidos
             ORDER BY c.nombre ASC, p.nombre ASC, m.nombre ASC`,
            params
        );

        res.json(rows);
    } catch (err) {
        console.error('Error materias profesor:', err);
        res.status(500).json({ error: 'Error al cargar materias del docente' });
    }
});

router.get('/tutor-estudiantes', authRequired, soloDocente, async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const [periodo] = await pool.query(
            `SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
        );
        const periodoId = periodo[0]?.id;
        if (!periodoId) return res.json({ cursos: [] });

        const filtroTutor = req.user.rol === 'ADMIN' ? '1=1' : 't.docente_usuario_id = ?';
        const paramsTutor = req.user.rol === 'ADMIN' ? [periodoId] : [usuarioId, periodoId];

        const [rows] = await pool.query(
            `SELECT t.id AS tutoria_id, t.curso_id, t.paralelo_id,
                    c.nombre AS curso, p.nombre AS paralelo,
                    m.id AS matricula_id, m.estado AS matricula_estado,
                    e.id AS estudiante_id, e.cedula_est, e.nombres_est, e.apellidos_est,
                    e.genero, e.fecha_nac, e.nombre_rep, e.cedula_rep,
                    e.celular_rep AS telefono_rep
             FROM tutorias t
             JOIN cursos c ON c.id = t.curso_id
             JOIN paralelos p ON p.id = t.paralelo_id
             LEFT JOIN matriculas m
                    ON m.curso_id = t.curso_id
                   AND m.paralelo_id = t.paralelo_id
                   AND m.periodo_id = t.periodo_id
                   AND m.estado IN ('ACTIVO','MATRICULADO')
             LEFT JOIN estudiantes e ON e.id = m.estudiante_id
             WHERE ${filtroTutor}
               AND t.periodo_id = ?
               AND t.estado = 'ACTIVO'
             ORDER BY c.nombre ASC, p.nombre ASC, e.apellidos_est ASC, e.nombres_est ASC`,
            paramsTutor
        );

        const cursos = [];
        const porTutoria = new Map();
        rows.forEach(row => {
            if (!porTutoria.has(row.tutoria_id)) {
                const curso = {
                    tutoria_id: row.tutoria_id,
                    curso_id: row.curso_id,
                    paralelo_id: row.paralelo_id,
                    curso: row.curso,
                    paralelo: row.paralelo,
                    estudiantes: [],
                };
                porTutoria.set(row.tutoria_id, curso);
                cursos.push(curso);
            }

            if (row.estudiante_id) {
                porTutoria.get(row.tutoria_id).estudiantes.push({
                    matricula_id: row.matricula_id,
                    estudiante_id: row.estudiante_id,
                    cedula_est: row.cedula_est,
                    nombres_est: row.nombres_est,
                    apellidos_est: row.apellidos_est,
                    genero: row.genero,
                    fecha_nac: row.fecha_nac,
                    nombre_rep: row.nombre_rep,
                    cedula_rep: row.cedula_rep,
                    telefono_rep: row.telefono_rep,
                });
            }
        });

        res.json({ cursos });
    } catch (err) {
        console.error('Error tutor-estudiantes:', err);
        res.status(500).json({ error: 'Error al cargar estudiantes de tutoria' });
    }
});

/* ── ASISTENCIA TUTOR (SCHEMA REAL) ─────────────────────────────
   La tabla real en la base es `asistencia`, no `asistencias`.
   La tabla guarda una fila por matricula y fecha, con estos campos:
     asistencia (id, matricula_id, fecha, estado, observacion, registrado_por, created_at)
   ──────────────────────────────────────────────────────────────── */
const MAPA_ESTADO_ASISTENCIA = {
    PRESENTE: 'P',
    AUSENTE: 'A',
    ATRASO: 'T',
    JUSTIFICADO: 'J',
    P: 'P',
    A: 'A',
    T: 'T',
    J: 'J',
};

function normalizarEstadoAsistencia(valor) {
    const v = String(valor || '').trim().toUpperCase();
    return MAPA_ESTADO_ASISTENCIA[v] || null;
}

router.get('/asistencia', authRequired, soloDocente, async (req, res) => {
    try {
        const { curso_id, paralelo_id, fecha } = req.query;
        const fechaFinal = fecha || new Date().toISOString().slice(0, 10);

        if (!curso_id || !paralelo_id) {
            return res.status(400).json({ error: 'Faltan curso_id o paralelo_id' });
        }

        const [periodoRows] = await pool.query(
            `SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
        );
        const periodoId = periodoRows[0]?.id;
        if (!periodoId) {
            return res.json({ asistencia_id: null, fecha: fechaFinal, detalles: [] });
        }

        const [matriculas] = await pool.query(
            `SELECT id
             FROM matriculas
             WHERE curso_id = ?
               AND paralelo_id = ?
               AND periodo_id = ?
               AND estado IN ('ACTIVO', 'MATRICULADO')
             ORDER BY id ASC`,
            [curso_id, paralelo_id, periodoId]
        );

        if (!matriculas.length) {
            return res.json({ asistencia_id: null, fecha: fechaFinal, detalles: [] });
        }

        const ids = matriculas.map(m => m.id);
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await pool.query(
            `SELECT a.id AS asistencia_id, a.matricula_id, a.estado, a.observacion
             FROM asistencia a
             WHERE a.fecha = ?
               AND a.matricula_id IN (${placeholders})
             ORDER BY a.matricula_id ASC`,
            [fechaFinal, ...ids]
        );

        const map = new Map(rows.map(row => [row.matricula_id, row]));
        const detalles = matriculas.map(m => {
            const row = map.get(m.id);
            return row
                ? { matricula_id: row.matricula_id, estado: row.estado, observacion: row.observacion }
                : { matricula_id: m.id, estado: null, observacion: null };
        });

        return res.json({
            asistencia_id: rows[0]?.asistencia_id || null,
            fecha: fechaFinal,
            detalles,
        });
    } catch (err) {
        if (String(err.code || '').includes('ER_NO_SUCH_TABLE')) {
            return res.status(501).json({
                error: 'Falta la tabla real de asistencia. Debe existir la tabla `asistencia`.'
            });
        }
        console.error('Error listar asistencia tutor:', err);
        return res.status(500).json({ error: 'Error al listar asistencia' });
    }
});

router.post('/asistencia', authRequired, soloDocente, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { curso_id, paralelo_id, fecha, registros } = req.body;
        const fechaFinal = fecha || new Date().toISOString().slice(0, 10);

        if (!curso_id || !paralelo_id || !Array.isArray(registros) || !registros.length) {
            return res.status(400).json({ error: 'Faltan datos de asistencia' });
        }

        const [periodoRows] = await connection.query(
            `SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
        );
        const periodoId = periodoRows[0]?.id;
        if (!periodoId) {
            return res.status(400).json({ error: 'No hay periodo lectivo activo' });
        }

        const [tutoria] = await connection.query(
            `SELECT id
             FROM tutorias
             WHERE docente_usuario_id = ? AND curso_id = ? AND paralelo_id = ?
               AND periodo_id = ? AND estado = 'ACTIVO'
             LIMIT 1`,
            [req.user.id, curso_id, paralelo_id, periodoId]
        );
        if (!tutoria.length && req.user.rol === 'PROFESOR') {
            return res.status(403).json({ error: 'No tienes tutoria activa para este curso/paralelo' });
        }

        await connection.beginTransaction();
        let asistenciaId = null;

        for (const item of registros) {
            const matriculaId = Number(item.matricula_id);
            const estado = normalizarEstadoAsistencia(item.estado);

            if (!matriculaId || !estado) {
                continue;
            }

            const [matriculaValida] = await connection.query(
                `SELECT id
                 FROM matriculas
                 WHERE id = ?
                   AND curso_id = ?
                   AND paralelo_id = ?
                   AND periodo_id = ?
                   AND estado IN ('ACTIVO', 'MATRICULADO')
                 LIMIT 1`,
                [matriculaId, curso_id, paralelo_id, periodoId]
            );

            if (!matriculaValida.length) {
                continue;
            }

            const [existente] = await connection.query(
                `SELECT id
                 FROM asistencia
                 WHERE matricula_id = ? AND fecha = ?
                 LIMIT 1`,
                [matriculaId, fechaFinal]
            );

            if (existente.length) {
                await connection.query(
                    `UPDATE asistencia
                     SET estado = ?, observacion = ?, registrado_por = ?
                     WHERE id = ?`,
                    [estado, item.observacion || null, req.user.id, existente[0].id]
                );
                asistenciaId = existente[0].id;
            } else {
                const [insertado] = await connection.query(
                    `INSERT INTO asistencia (matricula_id, fecha, estado, observacion, registrado_por)
                     VALUES (?, ?, ?, ?, ?)`,
                    [matriculaId, fechaFinal, estado, item.observacion || null, req.user.id]
                );
                asistenciaId = insertado.insertId;
            }
        }

        await connection.commit();
        return res.json({ success: true, asistencia_id: asistenciaId, fecha: fechaFinal });
    } catch (err) {
        await connection.rollback();
        if (String(err.code || '').includes('ER_NO_SUCH_TABLE')) {
            return res.status(501).json({
                error: 'Falta la tabla real de asistencia. Debe existir la tabla `asistencia`.'
            });
        }
        console.error('Error guardar asistencia tutor:', err);
        return res.status(500).json({ error: 'Error al guardar asistencia' });
    } finally {
        connection.release();
    }
});

router.get('/perfil', authRequired, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, nombres, apellidos, cedula, rol FROM usuarios WHERE id = ? LIMIT 1`,
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener el perfil' });
    }
});

module.exports = router;
