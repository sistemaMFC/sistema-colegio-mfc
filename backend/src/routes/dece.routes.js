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

  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_documentos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(200) NOT NULL,
      tipo VARCHAR(80) NOT NULL,
      descripcion TEXT,
      responsable VARCHAR(150) DEFAULT 'DECE',
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_actividades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(200) NOT NULL,
      tipo VARCHAR(80) NOT NULL,
      fecha DATE NOT NULL,
      responsable VARCHAR(150) DEFAULT 'DECE',
      descripcion TEXT,
      estado VARCHAR(30) DEFAULT 'PLANIFICADA',
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_talleres (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(200) NOT NULL,
      objetivo TEXT,
      fecha DATE NOT NULL,
      responsable VARCHAR(150) DEFAULT 'DECE',
      modalidad VARCHAR(80) DEFAULT 'PRESENCIAL',
      participantes INT DEFAULT 0,
      estado VARCHAR(30) DEFAULT 'PROGRAMADO',
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_listas_curso (
      id INT AUTO_INCREMENT PRIMARY KEY,
      curso VARCHAR(120) NOT NULL,
      periodo VARCHAR(80) DEFAULT '2026',
      estudiante VARCHAR(150) NOT NULL,
      cedula VARCHAR(20) DEFAULT '',
      observacion TEXT,
      faltas INT DEFAULT 0,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_faltas_injustificadas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      estudiante VARCHAR(150) NOT NULL,
      curso VARCHAR(120) NOT NULL,
      fecha DATE NOT NULL,
      detalle TEXT,
      tipo VARCHAR(80) DEFAULT 'FALTA',
      responsable VARCHAR(150) DEFAULT 'DECE',
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_derivaciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      estudiante VARCHAR(150) NOT NULL,
      curso VARCHAR(120) NOT NULL,
      tipo VARCHAR(80) NOT NULL,
      area VARCHAR(80) NOT NULL,
      motivo TEXT NOT NULL,
      estado VARCHAR(40) DEFAULT 'PENDIENTE',
      responsable VARCHAR(150) DEFAULT 'DECE',
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_violencia_protocolos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      estudiante VARCHAR(150) NOT NULL,
      curso VARCHAR(120) NOT NULL,
      tipo_incidente VARCHAR(80) NOT NULL,
      nivel_riesgo VARCHAR(30) DEFAULT 'MEDIA',
      descripcion TEXT NOT NULL,
      acciones TEXT,
      responsable VARCHAR(150) DEFAULT 'DECE',
      estado VARCHAR(40) DEFAULT 'PENDIENTE',
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dece_nee (
      id INT AUTO_INCREMENT PRIMARY KEY,
      estudiante VARCHAR(150) NOT NULL,
      curso VARCHAR(120) NOT NULL,
      tipo VARCHAR(80) NOT NULL,
      nivel VARCHAR(30) DEFAULT 'MODERADO',
      descripcion TEXT NOT NULL,
      apoyo TEXT,
      responsable VARCHAR(150) DEFAULT 'DECE',
      estado VARCHAR(40) DEFAULT 'ACTIVO',
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

router.get('/gestion/resumen', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();

    const [[documentosRow]] = await db.query('SELECT COUNT(*) AS total FROM dece_documentos');
    const [[actividadesRow]] = await db.query('SELECT COUNT(*) AS total FROM dece_actividades');
    const [[talleresRow]] = await db.query('SELECT COUNT(*) AS total FROM dece_talleres');
    const [[listasRow]] = await db.query('SELECT COUNT(*) AS total FROM dece_listas_curso');
    const [[faltasRow]] = await db.query('SELECT COUNT(*) AS total FROM dece_faltas_injustificadas');

    return res.json({
      success: true,
      resumen: {
        documentos: Number(documentosRow.total || 0),
        actividades: Number(actividadesRow.total || 0),
        talleres: Number(talleresRow.total || 0),
        listas: Number(listasRow.total || 0),
        faltas: Number(faltasRow.total || 0)
      }
    });
  } catch (error) {
    console.error('Error en resumen DECE:', error);
    return res.status(500).json({ error: 'Error al consultar resumen DECE' });
  }
});

router.get('/reportes/docentes', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();

    const [[totalCasosRow]] = await db.query('SELECT COUNT(*) AS total FROM dece_casos');
    const [[totalAtencionesRow]] = await db.query('SELECT COUNT(*) AS total FROM dece_atenciones');
    const [[casosDocentesRow]] = await db.query("SELECT COUNT(*) AS total FROM dece_casos WHERE LOWER(COALESCE(remitido_por, '')) LIKE '%docente%'");

    const [prioridadRows] = await db.query(
      'SELECT prioridad, COUNT(*) AS total FROM dece_casos GROUP BY prioridad ORDER BY total DESC'
    );

    const [tipoAtencionRows] = await db.query(
      'SELECT tipo, COUNT(*) AS total FROM dece_atenciones GROUP BY tipo ORDER BY total DESC LIMIT 5'
    );

    const [mesRows] = await db.query(
      "SELECT DATE_FORMAT(fecha_creacion, '%Y-%m') AS mes, COUNT(*) AS total FROM dece_casos GROUP BY DATE_FORMAT(fecha_creacion, '%Y-%m') ORDER BY mes DESC LIMIT 6"
    );

    const [remitidoRows] = await db.query(
      "SELECT remitido_por AS origen, COUNT(*) AS total FROM dece_casos WHERE COALESCE(remitido_por, '') <> '' GROUP BY remitido_por ORDER BY total DESC LIMIT 5"
    );

    return res.json({
      success: true,
      reporte: {
        totalCasos: Number(totalCasosRow.total || 0),
        totalAtenciones: Number(totalAtencionesRow.total || 0),
        casosDocentes: Number(casosDocentesRow.total || 0),
        prioridad: prioridadRows.map(row => ({ prioridad: row.prioridad || 'MEDIA', total: Number(row.total || 0) })),
        tiposAtencion: tipoAtencionRows.map(row => ({ tipo: row.tipo || 'SIN TIPO', total: Number(row.total || 0) })),
        porMes: mesRows.map(row => ({ mes: row.mes || 'N/A', total: Number(row.total || 0) })),
        origenes: remitidoRows.map(row => ({ origen: row.origen || 'SIN ORIGEN', total: Number(row.total || 0) }))
      }
    });
  } catch (error) {
    console.error('Error al generar reporte docente DECE:', error);
    return res.status(500).json({ error: 'Error al generar reporte docente DECE' });
  }
});

router.get('/violencia/protocolos', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const [rows] = await db.query('SELECT * FROM dece_violencia_protocolos ORDER BY fecha_creacion DESC LIMIT 100');
    return res.json({ success: true, protocolos: rows });
  } catch (error) {
    console.error('Error al listar protocolos de violencia DECE:', error);
    return res.status(500).json({ error: 'Error al listar protocolos de violencia DECE' });
  }
});

router.post('/violencia/protocolos', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const { estudiante, curso, tipoIncidente, nivelRiesgo, descripcion, acciones, responsable, estado } = req.body || {};

    if (!estudiante || !curso || !tipoIncidente || !descripcion) {
      return res.status(400).json({ error: 'Estudiante, curso, tipo de incidente y descripción son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO dece_violencia_protocolos (estudiante, curso, tipo_incidente, nivel_riesgo, descripcion, acciones, responsable, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        String(estudiante).trim(),
        String(curso).trim(),
        String(tipoIncidente).trim(),
        String(nivelRiesgo || 'MEDIA').trim().toUpperCase(),
        String(descripcion).trim(),
        String(acciones || '').trim(),
        String(responsable || 'DECE').trim(),
        String(estado || 'PENDIENTE').trim().toUpperCase()
      ]
    );

    const [rows] = await db.query('SELECT * FROM dece_violencia_protocolos WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, protocolo: rows[0] });
  } catch (error) {
    console.error('Error al crear protocolo de violencia DECE:', error);
    return res.status(500).json({ error: 'Error al crear protocolo de violencia DECE' });
  }
});

router.get('/nee', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const [rows] = await db.query('SELECT * FROM dece_nee ORDER BY fecha_creacion DESC LIMIT 100');
    return res.json({ success: true, nee: rows });
  } catch (error) {
    console.error('Error al listar NEE DECE:', error);
    return res.status(500).json({ error: 'Error al listar NEE DECE' });
  }
});

router.post('/nee', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const { estudiante, curso, tipo, nivel, descripcion, apoyo, responsable, estado } = req.body || {};

    if (!estudiante || !curso || !tipo || !descripcion) {
      return res.status(400).json({ error: 'Estudiante, curso, tipo y descripción son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO dece_nee (estudiante, curso, tipo, nivel, descripcion, apoyo, responsable, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        String(estudiante).trim(),
        String(curso).trim(),
        String(tipo).trim(),
        String(nivel || 'MODERADO').trim().toUpperCase(),
        String(descripcion).trim(),
        String(apoyo || '').trim(),
        String(responsable || 'DECE').trim(),
        String(estado || 'ACTIVO').trim().toUpperCase()
      ]
    );

    const [rows] = await db.query('SELECT * FROM dece_nee WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, necesidad: rows[0] });
  } catch (error) {
    console.error('Error al crear NEE DECE:', error);
    return res.status(500).json({ error: 'Error al crear NEE DECE' });
  }
});

router.get('/documentos', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const [rows] = await db.query('SELECT * FROM dece_documentos ORDER BY fecha_creacion DESC LIMIT 50');
    return res.json({ success: true, documentos: rows });
  } catch (error) {
    console.error('Error al listar documentos DECE:', error);
    return res.status(500).json({ error: 'Error al listar documentos DECE' });
  }
});

router.post('/documentos', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const { titulo, tipo, descripcion, responsable } = req.body || {};
    if (!titulo || !tipo) {
      return res.status(400).json({ error: 'Título y tipo son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO dece_documentos (titulo, tipo, descripcion, responsable) VALUES (?, ?, ?, ?)',
      [String(titulo).trim(), String(tipo).trim(), String(descripcion || '').trim(), String(responsable || 'DECE').trim()]
    );

    const [rows] = await db.query('SELECT * FROM dece_documentos WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, documento: rows[0] });
  } catch (error) {
    console.error('Error al crear documento DECE:', error);
    return res.status(500).json({ error: 'Error al crear documento DECE' });
  }
});

router.get('/actividades', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const [rows] = await db.query('SELECT * FROM dece_actividades ORDER BY fecha DESC LIMIT 50');
    return res.json({ success: true, actividades: rows });
  } catch (error) {
    console.error('Error al listar actividades DECE:', error);
    return res.status(500).json({ error: 'Error al listar actividades DECE' });
  }
});

router.post('/actividades', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const { titulo, tipo, fecha, responsable, descripcion, estado } = req.body || {};
    if (!titulo || !fecha) {
      return res.status(400).json({ error: 'Título y fecha son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO dece_actividades (titulo, tipo, fecha, responsable, descripcion, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [String(titulo).trim(), String(tipo || 'ACTIVIDAD').trim(), String(fecha), String(responsable || 'DECE').trim(), String(descripcion || '').trim(), String(estado || 'PLANIFICADA').trim()]
    );

    const [rows] = await db.query('SELECT * FROM dece_actividades WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, actividad: rows[0] });
  } catch (error) {
    console.error('Error al crear actividad DECE:', error);
    return res.status(500).json({ error: 'Error al crear actividad DECE' });
  }
});

router.get('/talleres', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const [rows] = await db.query('SELECT * FROM dece_talleres ORDER BY fecha DESC LIMIT 50');
    return res.json({ success: true, talleres: rows });
  } catch (error) {
    console.error('Error al listar talleres DECE:', error);
    return res.status(500).json({ error: 'Error al listar talleres DECE' });
  }
});

router.post('/talleres', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const { titulo, objetivo, fecha, responsable, modalidad, participantes, estado } = req.body || {};
    if (!titulo || !fecha) {
      return res.status(400).json({ error: 'Título y fecha son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO dece_talleres (titulo, objetivo, fecha, responsable, modalidad, participantes, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [String(titulo).trim(), String(objetivo || '').trim(), String(fecha), String(responsable || 'DECE').trim(), String(modalidad || 'PRESENCIAL').trim(), Number(participantes || 0), String(estado || 'PROGRAMADO').trim()]
    );

    const [rows] = await db.query('SELECT * FROM dece_talleres WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, taller: rows[0] });
  } catch (error) {
    console.error('Error al crear taller DECE:', error);
    return res.status(500).json({ error: 'Error al crear taller DECE' });
  }
});

router.get('/listas', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const curso = String(req.query.curso || '').trim();
    const where = curso ? ' WHERE curso = ? ' : '';
    const params = curso ? [curso] : [];
    const [rows] = await db.query(`SELECT * FROM dece_listas_curso ${where} ORDER BY curso, estudiante LIMIT 100`, params);
    return res.json({ success: true, listas: rows });
  } catch (error) {
    console.error('Error al listar listas DECE:', error);
    return res.status(500).json({ error: 'Error al listar listas DECE' });
  }
});

router.post('/listas', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const { curso, periodo, estudiante, cedula, observacion, faltas } = req.body || {};
    if (!curso || !estudiante) {
      return res.status(400).json({ error: 'Curso y estudiante son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO dece_listas_curso (curso, periodo, estudiante, cedula, observacion, faltas) VALUES (?, ?, ?, ?, ?, ?)',
      [String(curso).trim(), String(periodo || '2026').trim(), String(estudiante).trim(), String(cedula || '').trim(), String(observacion || '').trim(), Number(faltas || 0)]
    );

    const [rows] = await db.query('SELECT * FROM dece_listas_curso WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, lista: rows[0] });
  } catch (error) {
    console.error('Error al crear lista DECE:', error);
    return res.status(500).json({ error: 'Error al crear lista DECE' });
  }
});

router.get('/faltas', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const [rows] = await db.query('SELECT * FROM dece_faltas_injustificadas ORDER BY fecha DESC LIMIT 100');
    return res.json({ success: true, faltas: rows });
  } catch (error) {
    console.error('Error al listar faltas DECE:', error);
    return res.status(500).json({ error: 'Error al listar faltas DECE' });
  }
});

router.post('/faltas', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const { estudiante, curso, fecha, detalle, tipo, responsable } = req.body || {};
    if (!estudiante || !curso || !fecha) {
      return res.status(400).json({ error: 'Estudiante, curso y fecha son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO dece_faltas_injustificadas (estudiante, curso, fecha, detalle, tipo, responsable) VALUES (?, ?, ?, ?, ?, ?)',
      [String(estudiante).trim(), String(curso).trim(), String(fecha), String(detalle || '').trim(), String(tipo || 'FALTA').trim(), String(responsable || 'DECE').trim()]
    );

    const [rows] = await db.query('SELECT * FROM dece_faltas_injustificadas WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, falta: rows[0] });
  } catch (error) {
    console.error('Error al crear falta DECE:', error);
    return res.status(500).json({ error: 'Error al crear falta DECE' });
  }
});

router.get('/derivaciones', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const [rows] = await db.query('SELECT * FROM dece_derivaciones ORDER BY fecha_creacion DESC LIMIT 100');
    return res.json({ success: true, derivaciones: rows });
  } catch (error) {
    console.error('Error al listar derivaciones DECE:', error);
    return res.status(500).json({ error: 'Error al listar derivaciones DECE' });
  }
});

router.post('/derivaciones', authRequired, requireAnyRole(['ADMIN', 'PSICOLOGO']), async (req, res) => {
  try {
    await ensureDeceTables();
    const { estudiante, curso, tipo, area, motivo, estado, responsable } = req.body || {};
    if (!estudiante || !curso || !tipo || !area || !motivo) {
      return res.status(400).json({ error: 'Estudiante, curso, tipo, área y motivo son obligatorios' });
    }

    const [result] = await db.query(
      'INSERT INTO dece_derivaciones (estudiante, curso, tipo, area, motivo, estado, responsable) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [String(estudiante).trim(), String(curso).trim(), String(tipo).trim(), String(area).trim(), String(motivo).trim(), String(estado || 'PENDIENTE').trim(), String(responsable || 'DECE').trim()]
    );

    const [rows] = await db.query('SELECT * FROM dece_derivaciones WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ success: true, derivacion: rows[0] });
  } catch (error) {
    console.error('Error al crear derivación DECE:', error);
    return res.status(500).json({ error: 'Error al crear derivación DECE' });
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
