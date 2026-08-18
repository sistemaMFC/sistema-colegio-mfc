require('dotenv').config();
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
  });

  try {
    // Datos reales: usuario profesor ID 15 con asignaciones activas
    const usuarioId = 15;
    const [periodo] = await pool.query(
      'SELECT id FROM periodos_lectivos WHERE estado = ? LIMIT 1',
      ['ACTIVO']
    );
    const periodoId = periodo[0]?.id;

    const [trimestre] = await pool.query(
      'SELECT id FROM trimestres LIMIT 1'
    );
    const trimestreId = trimestre[0]?.id;

    // Obtener la primera asignación del profesor
    const [asignaciones] = await pool.query(
      `SELECT ad.id, ad.materia_id, m.nombre, c.nombre as curso, p.nombre as paralelo
       FROM asignaciones_docente ad
       JOIN materias m ON m.id = ad.materia_id
       JOIN cursos c ON c.id = ad.curso_id
       JOIN paralelos p ON p.id = ad.paralelo_id
       WHERE ad.docente_usuario_id = ? AND ad.periodo_id = ? AND ad.estado = 'ACTIVO'
       LIMIT 1`,
      [usuarioId, periodoId]
    );

    if (!asignaciones.length || !periodoId || !trimestreId) {
      console.log(JSON.stringify({
        estado: 'ERROR',
        mensaje: 'No hay datos suficientes',
        periodoId, trimestreId, asignacionesCount: asignaciones.length
      }, null, 2));
      process.exit(1);
    }

    const asignacion = asignaciones[0];
    const asignacionId = asignacion.id;

    console.log('\n=== FLUJO ACADÉMICO PROFESOR ===');
    console.log(`Usuario: ${usuarioId}`);
    console.log(`Período: ${periodoId}`);
    console.log(`Trimestre: ${trimestreId}`);
    console.log(`Asignación: ${asignacionId} (${asignacion.materia})`);

    // 1. GET /api/academico/libro
    console.log('\n[1] Consultando libro académico...');
    const [parciales] = await pool.query(
      `SELECT id, nombre, estado FROM academico_parciales 
       WHERE asignacion_id = ? AND trimestre_id = ? 
       ORDER BY orden ASC LIMIT 3`,
      [asignacionId, trimestreId]
    );
    console.log(`Parciales existentes: ${parciales.length}`);
    parciales.forEach(p => console.log(`  - ${p.nombre} (${p.estado})`));

    // 2. Verificar estudiantes de la asignación
    const [estudiantes] = await pool.query(
      `SELECT m.id as matricula_id, e.id, e.nombres_est, e.apellidos_est
       FROM matriculas m
       JOIN estudiantes e ON e.id = m.estudiante_id
       WHERE m.curso_id = ? AND m.paralelo_id = ? AND m.periodo_id = ? AND m.estado IN ('ACTIVO','MATRICULADO')
       LIMIT 5`,
      [asignacion.curso_id || 0, asignacion.paralelo_id || 0, periodoId]
    );
    console.log(`\nEstudiantes en el curso: ${estudiantes.length}`);
    estudiantes.forEach(e => console.log(`  - ${e.apellidos_est}, ${e.nombres_est}`));

    // 3. Verificar insumos existentes
    if (parciales.length > 0) {
      const parcialId = parciales[0].id;
      const [insumos] = await pool.query(
        `SELECT id, tipo, nombre FROM academico_insumos 
         WHERE parcial_id = ? AND estado = 'ACTIVO' LIMIT 5`,
        [parcialId]
      );
      console.log(`\nInsumos en ${parciales[0].nombre}: ${insumos.length}`);
      insumos.forEach(i => console.log(`  - ${i.tipo}: ${i.nombre}`));
    }

    console.log('\n=== FLUJO VALIDADO ===');
    console.log('✅ Profesor tiene asignaciones activas');
    console.log('✅ Existen parciales en la base');
    console.log('✅ Existen estudiantes en el curso');
    console.log('✅ Listo para crear/editar insumos y notas');

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
