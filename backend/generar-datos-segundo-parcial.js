require('dotenv').config();
const mysql = require('mysql2/promise');

const selectedAsignacionId = Number(process.argv[2]) || null;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const insumosBase = [
  { tipo: 'TAREA', nombre: 'Tarea de investigación' },
  { tipo: 'LECCION', nombre: 'Lección oral' },
  { tipo: 'TALLER', nombre: 'Trabajo grupal' },
  { tipo: 'INDIVIDUAL', nombre: 'Actividad individual' },
  { tipo: 'APORTE', nombre: 'Prueba corta' },
];

function calcularNota(estudianteIndex, insumoIndex) {
  const base = 6.5 + (estudianteIndex % 3) * 0.8 + (insumoIndex % 4) * 0.5;
  const extra = ((estudianteIndex + 1) * 0.22) + ((insumoIndex + 1) * 0.18);
  return Number(Math.min(9.8, base + extra).toFixed(2));
}

function obtenerTrimestreActual() {
  const now = new Date();
  const mes = now.getMonth() + 1;
  if (mes <= 3) return 1;
  if (mes <= 6) return 2;
  if (mes <= 9) return 3;
  return 4;
}

async function obtenerAsignaciones() {
  const [rows] = await pool.query(`
    SELECT a.id AS asignacion_id,
           m.nombre AS materia,
           c.nombre AS curso,
           p.nombre AS paralelo,
           e.nombre AS especialidad,
           a.estado
    FROM asignaciones_docente a
    LEFT JOIN materias m ON m.id = a.materia_id
    LEFT JOIN cursos c ON c.id = a.curso_id
    LEFT JOIN paralelos p ON p.id = a.paralelo_id
    LEFT JOIN especialidades e ON e.id = a.especialidad_id
    ORDER BY a.id ASC
  `);
  return rows;
}

async function obtenerAsignacionSeleccionada() {
  const rows = await obtenerAsignaciones();

  if (!rows.length) {
    throw new Error('No hay asignaciones_docente registradas en la base.');
  }

  if (selectedAsignacionId) {
    const fila = rows.find(r => Number(r.asignacion_id) === Number(selectedAsignacionId));
    if (!fila) {
      throw new Error(`La asignación ${selectedAsignacionId} no existe.`);
    }
    return fila;
  }

  return rows[0];
}

async function obtenerEstudiantesAsignacion(asignacionId) {
  const [rows] = await pool.query(`
    SELECT m.id AS matricula_id,
           e.id AS estudiante_id,
           e.apellidos_est,
           e.nombres_est,
           e.cedula_est
    FROM matriculas m
    JOIN estudiantes e ON e.id = m.estudiante_id
    WHERE m.curso_id = (SELECT curso_id FROM asignaciones_docente WHERE id = ?)
      AND m.paralelo_id = (SELECT paralelo_id FROM asignaciones_docente WHERE id = ?)
    ORDER BY e.apellidos_est, e.nombres_est
  `, [asignacionId, asignacionId]);

  return rows;
}

async function obtenerTrimestreIdPorNumero(numero) {
  const [rows] = await pool.query('SELECT id FROM trimestres WHERE numero = ? LIMIT 1', [numero]);
  return rows[0]?.id || null;
}

async function asegurarParcial(asignacionId, trimestreId) {
  const [rows] = await pool.query(
    'SELECT id, nombre, orden FROM academico_parciales WHERE asignacion_id = ? AND trimestre_id = ? AND orden = 2 LIMIT 1',
    [asignacionId, trimestreId]
  );

  if (rows[0]) return rows[0].id;

  const [result] = await pool.query(
    'INSERT INTO academico_parciales (asignacion_id, trimestre_id, nombre, orden, estado) VALUES (?, ?, ?, 2, "ABIERTO")',
    [asignacionId, trimestreId, 'PARCIAL 2']
  );

  return result.insertId;
}

async function asegurarInsumos(parcialId) {
  const creados = [];
  for (let i = 0; i < insumosBase.length; i++) {
    const item = insumosBase[i];
    const nombreFinal = `${item.nombre} ${i + 1}`;

    const [rows] = await pool.query(
      'SELECT id FROM academico_insumos WHERE parcial_id = ? AND tipo = ? AND nombre = ? LIMIT 1',
      [parcialId, item.tipo, nombreFinal]
    );

    if (rows[0]) {
      creados.push(rows[0].id);
      continue;
    }

    const [result] = await pool.query(
      'INSERT INTO academico_insumos (parcial_id, tipo, nombre, orden, estado) VALUES (?, ?, ?, ?, "ACTIVO")',
      [parcialId, item.tipo, nombreFinal, i + 1]
    );
    creados.push(result.insertId);
  }

  return creados;
}

async function guardarNotas(parcialId, insumosIds, matriculas) {
  for (let i = 0; i < matriculas.length; i++) {
    const alumno = matriculas[i];
    for (let j = 0; j < insumosIds.length; j++) {
      const insumoId = insumosIds[j];
      const nota = calcularNota(i, j);
      await pool.query(
        `INSERT INTO academico_notas_insumos (insumo_id, matricula_id, nota, observacion, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE nota = VALUES(nota), observacion = VALUES(observacion), updated_at = NOW()`,
        [insumoId, alumno.matricula_id, nota, `Segundo parcial - ${alumno.apellidos_est} ${alumno.nombres_est}`]
      );
    }
  }
}

async function guardarExamenTrimestral(asignacionId, trimestreId, matriculas) {
  for (let i = 0; i < matriculas.length; i++) {
    const alumno = matriculas[i];
    const nota = Number((7.3 + (i % 4) * 0.7 + 0.25).toFixed(2));
    await pool.query(
      `INSERT INTO academico_examenes_trimestrales (asignacion_id, trimestre_id, matricula_id, nota, observacion, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, NOW(), NOW())
       ON DUPLICATE KEY UPDATE nota = VALUES(nota), observacion = VALUES(observacion), updated_at = NOW()`,
      [asignacionId, trimestreId, alumno.matricula_id, nota, `Examen trimestral - ${alumno.apellidos_est} ${alumno.nombres_est}`]
    );
  }
}

(async () => {
  try {
    const asignacion = await obtenerAsignacionSeleccionada();
    const trimestreNumero = obtenerTrimestreActual();
    const trimestreId = await obtenerTrimestreIdPorNumero(trimestreNumero);

    if (!trimestreId) {
      throw new Error(`No existe un trimestre con número ${trimestreNumero}.`);
    }

    const estudiantes = await obtenerEstudiantesAsignacion(asignacion.asignacion_id);

    if (!estudiantes.length) {
      throw new Error(`La asignación ${asignacion.asignacion_id} no tiene estudiantes matriculados para ese curso/paralelo.`);
    }

    const parcialId = await asegurarParcial(asignacion.asignacion_id, trimestreId);
    const insumosIds = await asegurarInsumos(parcialId);
    await guardarNotas(parcialId, insumosIds, estudiantes);
    await guardarExamenTrimestral(asignacion.asignacion_id, trimestreId, estudiantes);

    console.log(JSON.stringify({
      ok: true,
      asignacion_id: asignacion.asignacion_id,
      curso: asignacion.curso,
      paralelo: asignacion.paralelo,
      materia: asignacion.materia,
      trimestre_numero: trimestreNumero,
      trimestre_id: trimestreId,
      parcial_id: parcialId,
      estudiantes: estudiantes.length,
      insumos: insumosIds.length,
      mensaje: 'Datos de segundo parcial creados correctamente.'
    }, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
