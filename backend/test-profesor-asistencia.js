require('dotenv').config();
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const BASE = 'http://localhost:3000';
const PROFESOR_ID = 15;

async function main() {
  const cfg = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    connectTimeout: 15000,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 1,
  };

  const pool = mysql.createPool(cfg);
  try {
    const [tut] = await pool.query(
      "SELECT id, curso_id, paralelo_id, periodo_id FROM tutorias WHERE docente_usuario_id = ? AND estado = 'ACTIVO' LIMIT 1",
      [PROFESOR_ID]
    );

    if (!tut.length) {
      console.log('NO_HAY_TUTORIA_ACTIVA_PARA_PROFESOR', PROFESOR_ID);
      return;
    }

    const tutor = tut[0];
    console.log('TUTORIA', tutor);

    const [mat] = await pool.query(
      "SELECT id, estudiante_id, curso_id, paralelo_id, periodo_id FROM matriculas WHERE curso_id = ? AND paralelo_id = ? AND periodo_id = ? AND estado IN ('ACTIVO', 'MATRICULADO') ORDER BY id LIMIT 5",
      [tutor.curso_id, tutor.paralelo_id, tutor.periodo_id]
    );

    if (!mat.length) {
      console.log('NO_HAY_MATRICULAS_ACTIVAS_PARA_CURSO', tutor.curso_id, tutor.paralelo_id, tutor.periodo_id);
      return;
    }

    const matricula = mat[0];
    console.log('MATRICULA_SELECCIONADA', matricula);

    const token = jwt.sign({ id: PROFESOR_ID, rol: 'PROFESOR', cedula: '0000000000' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
    const fecha = new Date().toISOString().slice(0, 10);

    const urlTutor = `${BASE}/api/profesor/tutor-estudiantes`;
    const urlAsi = `${BASE}/api/profesor/asistencia?curso_id=${tutor.curso_id}&paralelo_id=${tutor.paralelo_id}&fecha=${fecha}`;

    const r1 = await fetch(urlTutor, { headers });
    console.log('GET_TUTOR_STATUS', r1.status);
    console.log('GET_TUTOR_BODY', await r1.text());

    const r2 = await fetch(urlAsi, { headers });
    console.log('GET_ASIST_STATUS', r2.status);
    console.log('GET_ASIST_BODY', await r2.text());

    const payload = {
      curso_id: tutor.curso_id,
      paralelo_id: tutor.paralelo_id,
      fecha,
      registros: [{ matricula_id: Number(matricula.id), estado: 'PRESENTE', observacion: 'prueba automatica' }],
    };

    const r3 = await fetch(`${BASE}/api/profesor/asistencia`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    console.log('POST_ASIST_STATUS', r3.status);
    console.log('POST_ASIST_BODY', await r3.text());

    const r4 = await fetch(urlAsi, { headers });
    console.log('GET_ASIST_2_STATUS', r4.status);
    console.log('GET_ASIST_2_BODY', await r4.text());
  } catch (err) {
    console.error('ERROR_PRINCIPAL', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
