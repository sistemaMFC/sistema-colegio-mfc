const express = require('express');
const db = require('../db');
const { authRequired, requireAnyRole } = require('../middlewares/auth');

const router = express.Router();

async function ensureDeceTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_casos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      estudiante VARCHAR(150) NOT NULL,
      curso VARCHAR(120) NOT NULL,
      motivo TEXT NOT NULL,
      prioridad VARCHAR(20) DEFAULT 'MEDIA',
      estado VARCHAR(40) DEFAULT 'ACTIVO',
      remitido_por VARCHAR(150) DEFAULT 'Sin remisión',
      observaciones TEXT,
      responsable VARCHAR(120) DEFAULT 'DECE',
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_atenciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      caso_id INT NOT NULL,
      estudiante VARCHAR(150) NOT NULL,
      tipo VARCHAR(30) NOT NULL,
      resumen TEXT NOT NULL,
      responsable VARCHAR(120) DEFAULT 'Psicólogo',
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (caso_id) REFERENCES dece_casos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.get('/dashboard', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();

    const [[atencionesHoyRow]] = await db.query(
      "SELECT COUNT(*) AS total FROM dece_atenciones WHERE DATE(fecha_creacion) = CURDATE()"
    );
    const [[casosActivosRow]] = await db.query(
      "SELECT COUNT(*) AS total FROM dece_casos WHERE estado IN ('ACTIVO', 'EN SEGUIMIENTO')"
    );
    const [[seguimientosPendingRow]] = await db.query(
      "SELECT COUNT(*) AS total FROM dece_casos WHERE estado = 'EN SEGUIMIENTO'"
    );
    const [[remisionesRow]] = await db.query(
      "SELECT COUNT(*) AS total FROM dece_casos WHERE LOWER(COALESCE(remitido_por, '')) LIKE '%docente%'"
    );

    return res.json({
      success: true,
      module: 'DECE',
      stats: {
        atencionesHoy: Number(atencionesHoyRow.total || 0),
        casosActivos: Number(casosActivosRow.total || 0),
        seguimientosPendientes: Number(seguimientosPendingRow.total || 0),
        remisionesDocentes: Number(remisionesRow.total || 0),
        usuario: {
          id: req.user.id,
          roles: req.user.roles || []
        }
      }
    });
  } catch (error) {
    console.error('Error en DECE dashboard:', error);
    return res.status(500).json({ error: 'Error al consultar dashboard DECE' });
  }
});

router.get('/casos', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const [rows] = await db.query(
      'SELECT * FROM dece_casos ORDER BY fecha_creacion DESC LIMIT 100'
    );
    return res.json({ success: true, casos: rows });
  } catch (error) {
    console.error('Error al listar casos DECE:', error);
    return res.status(500).json({ error: 'Error al listar casos DECE' });
  }
});

router.post('/casos', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();

    const { estudiante, curso, motivo, prioridad, remitidoPor, observaciones } = req.body || {};

    if (!estudiante || !curso || !motivo) {
      return res.status(400).json({ error: 'Estudiante, curso y motivo son obligatorios' });
    }

    const [result] = await db.query(
      `INSERT INTO dece_casos (estudiante, curso, motivo, prioridad, estado, remitido_por, observaciones, responsable)
       VALUES (?, ?, ?, ?, 'ACTIVO', ?, ?, 'DECE')`,
      [
        String(estudiante).trim(),
        String(curso).trim(),
        String(motivo).trim(),
        String(prioridad || 'MEDIA').trim().toUpperCase(),
        String(remitidoPor || 'Sin remisión').trim(),
        String(observaciones || '').trim()
      ]
    );

    const [rows] = await db.query('SELECT * FROM dece_casos WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, caso: rows[0] });
  } catch (error) {
    console.error('Error al crear caso DECE:', error);
    return res.status(500).json({ error: 'Error al crear caso DECE' });
  }
});

router.get('/atenciones', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const [rows] = await db.query(
      'SELECT * FROM dece_atenciones ORDER BY fecha_creacion DESC LIMIT 200'
    );
    return res.json({ success: true, atenciones: rows });
  } catch (error) {
    console.error('Error al listar atenciones DECE:', error);
    return res.status(500).json({ error: 'Error al listar atenciones DECE' });
  }
});

router.post('/atenciones', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();

    const { casoId, estudiante, tipo, resumen } = req.body || {};

    if (!casoId || !estudiante || !tipo || !resumen) {
      return res.status(400).json({ error: 'Debe indicar caso, estudiante, tipo y resumen' });
    }

    const [caseRow] = await db.query('SELECT id FROM dece_casos WHERE id = ? LIMIT 1', [Number(casoId)]);
    if (!caseRow.length) {
      return res.status(404).json({ error: 'Caso DECE no encontrado' });
    }

    const [result] = await db.query(
      `INSERT INTO dece_atenciones (caso_id, estudiante, tipo, resumen, responsable)
       VALUES (?, ?, ?, ?, 'Psicólogo')`,
      [Number(casoId), String(estudiante).trim(), String(tipo).trim().toUpperCase(), String(resumen).trim()]
    );

    const [rows] = await db.query('SELECT * FROM dece_atenciones WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, atencion: rows[0] });
  } catch (error) {
    console.error('Error al crear atención DECE:', error);
    return res.status(500).json({ error: 'Error al crear atención DECE' });
  }
});

router.get('/me', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  return res.json({
    success: true,
    module: 'DECE',
    user: {
      id: req.user.id,
      roles: req.user.roles || []
    }
  });
});

module.exports = router;
