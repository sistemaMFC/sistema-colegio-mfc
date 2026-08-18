require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
  });

  try {
    const asignacionId = 52;
    const parcialId = 1; // PARCIAL 1
    const primerEstudianteMatriculaId = 191; // Primera matrícula del curso

    console.log('=== TEST DE ESCRITURA ACADÉMICA ===\n');

    // 1. Crear un insumo de prueba
    console.log('[1] Creando insumo TAREA...');
    const [resultInsumo] = await connection.execute(
      `INSERT INTO academico_insumos (parcial_id, tipo, nombre, orden, estado, created_at, updated_at)
       VALUES (?, 'TAREA', 'Test Tarea - Validacion Fase 5', 1, 'ACTIVO', NOW(), NOW())`,
      [parcialId]
    );
    const insumoId = resultInsumo.insertId;
    console.log(`✅ Insumo creado: ID ${insumoId}`);

    // 2. Guardar una nota para el insumo
    console.log(`\n[2] Guardando nota de insumo (matrícula ${primerEstudianteMatriculaId})...`);
    const [resultNota] = await connection.execute(
      `INSERT INTO academico_notas_insumos (insumo_id, matricula_id, nota, observacion, created_at, updated_at)
       VALUES (?, ?, 9.5, 'Test de validación', NOW(), NOW())
       ON DUPLICATE KEY UPDATE nota = 9.5, observacion = 'Test de validación', updated_at = NOW()`,
      [insumoId, primerEstudianteMatriculaId]
    );
    console.log(`✅ Nota guardada: ${resultNota.affectedRows > 0 ? 'INSERTADO' : 'ACTUALIZADO'}`);

    // 3. Crear nota de examen trimestral
    console.log('\n[3] Guardando examen trimestral...');
    const [resultExamen] = await connection.execute(
      `INSERT INTO academico_examenes_trimestrales (asignacion_id, trimestre_id, matricula_id, nota, observacion, created_at, updated_at)
       VALUES (?, 1, ?, 8.8, 'Test de validación', NOW(), NOW())
       ON DUPLICATE KEY UPDATE nota = 8.8, observacion = 'Test de validación', updated_at = NOW()`,
      [asignacionId, primerEstudianteMatriculaId]
    );
    console.log(`✅ Examen guardado: ${resultExamen.affectedRows > 0 ? 'INSERTADO' : 'ACTUALIZADO'}`);

    // 4. Verificar que se guardó
    console.log('\n[4] Verificando datos guardados...');
    const [insumos] = await connection.execute(
      `SELECT id, tipo, nombre FROM academico_insumos WHERE parcial_id = ? AND estado = 'ACTIVO'`,
      [parcialId]
    );
    console.log(`Insumos en PARCIAL 1: ${insumos.length}`);
    insumos.forEach(i => console.log(`  - ${i.tipo}: ${i.nombre}`));

    const [notas] = await connection.execute(
      `SELECT insum.tipo, insum.nombre, nin.nota 
       FROM academico_notas_insumos nin
       JOIN academico_insumos insum ON insum.id = nin.insumo_id
       WHERE nin.matricula_id = ? ORDER BY insum.parcial_id, insum.tipo`,
      [primerEstudianteMatriculaId]
    );
    console.log(`\nNotas del primer estudiante: ${notas.length}`);
    notas.forEach(n => console.log(`  - ${n.tipo} "${n.nombre}": ${n.nota}`));

    console.log('\n✅ FLUJO DE ESCRITURA VALIDADO');
    console.log('El profesor puede crear insumos y guardar notas en tiempo real');

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
