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

/* ── GET /api/profesor/mi-docente ──────────────────────────────
   Devuelve: datos del docente + sus asignaciones + sus tutorias
   El portal del profesor usa esto para construir toda la UI.
   ──────────────────────────────────────────────────────────── */
router.get('/mi-docente', authRequired, soloDocente, async (req, res) => {
    try {
        const usuarioId = req.user.id;

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

        if (docente.id) {
            const [periodo] = await pool.query(
                `SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
            );
            const periodoId = periodo[0]?.id;

            if (periodoId) {
                const [asig] = await pool.query(
                    `SELECT ad.id, ad.materia_id, ad.curso_id, ad.paralelo_id,
                            m.nombre AS materia, m.codigo AS materia_codigo,
                            c.nombre AS curso, p.nombre AS paralelo
                     FROM asignaciones_docente ad
                     JOIN materias  m ON m.id = ad.materia_id
                     JOIN cursos    c ON c.id = ad.curso_id
                     JOIN paralelos p ON p.id = ad.paralelo_id
                     WHERE ad.docente_id = ? AND ad.periodo_id = ? AND ad.estado = 'ACTIVO'
                     ORDER BY c.nombre, m.nombre`,
                    [docente.id, periodoId]
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