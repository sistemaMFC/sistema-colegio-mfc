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

        if (docente.id || cfg.tipo === 'usuario') {
            const [periodo] = await pool.query(
                `SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
            );
            const periodoId = periodo[0]?.id;

            if (periodoId) {
                const filtroProfesor = cfg.tipo === 'docente'
                    ? `ad.${cfg.col} = ?`
                    : `ad.${cfg.col} = ?`;
                const profesorValor = cfg.tipo === 'docente' ? docente.id : usuarioId;
                const [asig] = await pool.query(
                    `SELECT ad.id, ad.materia_id, ad.curso_id, ad.paralelo_id,
                            m.nombre AS materia, m.codigo AS materia_codigo,
                            c.nombre AS curso, p.nombre AS paralelo
                     FROM asignaciones_docente ad
                     JOIN materias  m ON m.id = ad.materia_id
                     JOIN cursos    c ON c.id = ad.curso_id
                     JOIN paralelos p ON p.id = ad.paralelo_id
                     WHERE ${filtroProfesor} AND ad.periodo_id = ? AND ad.estado = 'ACTIVO'
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
router.get('/tutor-estudiantes', authRequired, soloDocente, async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const [periodo] = await pool.query(
            `SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
        );
        const periodoId = periodo[0]?.id;
        if (!periodoId) return res.json({ cursos: [] });

        const [rows] = await pool.query(
            `SELECT t.id AS tutoria_id, t.curso_id, t.paralelo_id,
                    c.nombre AS curso, p.nombre AS paralelo,
                    m.id AS matricula_id, m.estado AS matricula_estado,
                    e.id AS estudiante_id, e.cedula_est, e.nombres_est, e.apellidos_est,
                    e.genero, e.fecha_nac, e.nombre_rep, e.cedula_rep, e.telefono_rep
             FROM tutorias t
             JOIN cursos c ON c.id = t.curso_id
             JOIN paralelos p ON p.id = t.paralelo_id
             LEFT JOIN matriculas m
                    ON m.curso_id = t.curso_id
                   AND m.paralelo_id = t.paralelo_id
                   AND m.periodo_id = t.periodo_id
                   AND m.estado IN ('ACTIVO','MATRICULADO')
             LEFT JOIN estudiantes e ON e.id = m.estudiante_id
             WHERE t.docente_usuario_id = ?
               AND t.periodo_id = ?
               AND t.estado = 'ACTIVO'
             ORDER BY c.nombre ASC, p.nombre ASC, e.apellidos_est ASC, e.nombres_est ASC`,
            [usuarioId, periodoId]
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
