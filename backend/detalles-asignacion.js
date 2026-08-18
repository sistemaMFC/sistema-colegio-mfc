require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
  });

  try {
    const asignacionId = 52; // La que vimos en la query anterior
    
    console.log('=== DETALLES ASIGNACIÓN 52 ===\n');
    
    // Obtener detalles completos de la asignación
    const [asignacion] = await pool.query(
      `SELECT ad.id, ad.docente_usuario_id, ad.periodo_id, ad.curso_id, ad.paralelo_id, 
              ad.especialidad_id, ad.materia_id, ad.estado,
              m.nombre as materia, c.nombre as curso, p.nombre as paralelo
       FROM asignaciones_docente ad
       LEFT JOIN materias m ON m.id = ad.materia_id
       LEFT JOIN cursos c ON c.id = ad.curso_id
       LEFT JOIN paralelos p ON p.id = ad.paralelo_id
       WHERE ad.id = ?`,
      [asignacionId]
    );
    
    if (!asignacion.length) {
      console.log('Asignación no encontrada');
      process.exit(1);
    }
    
    const a = asignacion[0];
    console.log(`ID: ${a.id}`);
    console.log(`Docente Usuario: ${a.docente_usuario_id}`);
    console.log(`Materia: ${a.materia} (${a.materia_id})`);
    console.log(`Curso: ${a.curso} (${a.curso_id})`);
    console.log(`Paralelo: ${a.paralelo} (${a.paralelo_id})`);
    console.log(`Período: ${a.periodo_id}`);
    console.log(`Especialidad: ${a.especialidad_id}`);
    console.log(`Estado: ${a.estado}`);
    
    // Contar estudiantes
    const [estudiantes] = await pool.query(
      `SELECT COUNT(*) as total
       FROM matriculas m
       WHERE m.curso_id = ? AND m.paralelo_id = ? AND m.periodo_id = ? AND m.estado IN ('ACTIVO','MATRICULADO')`,
      [a.curso_id, a.paralelo_id, a.periodo_id]
    );
    
    console.log(`\nEstudiantes en curso/paralelo: ${estudiantes[0].total}`);
    
    // Listar los primeros 5 estudiantes
    const [listaEst] = await pool.query(
      `SELECT m.id as matricula_id, e.nombres_est, e.apellidos_est, e.cedula_est
       FROM matriculas m
       JOIN estudiantes e ON e.id = m.estudiante_id
       WHERE m.curso_id = ? AND m.paralelo_id = ? AND m.periodo_id = ? AND m.estado IN ('ACTIVO','MATRICULADO')
       LIMIT 5`,
      [a.curso_id, a.paralelo_id, a.periodo_id]
    );
    
    if (listaEst.length) {
      console.log('\nPrimeros 5 estudiantes:');
      listaEst.forEach((e, i) => {
        console.log(`  ${i+1}. ${e.apellidos_est}, ${e.nombres_est} (${e.cedula_est})`);
      });
    }
    
    // Verificar parciales
    const [parciales] = await pool.query(
      `SELECT id, nombre, orden, estado FROM academico_parciales 
       WHERE asignacion_id = ? ORDER BY orden`,
      [asignacionId]
    );
    
    console.log(`\nParciales: ${parciales.length}`);
    parciales.forEach(p => {
      console.log(`  - ${p.nombre} (orden ${p.orden}, ${p.estado})`);
    });
    
    // Verificar insumos en primer parcial
    if (parciales.length > 0) {
      const [insumos] = await pool.query(
        `SELECT id, tipo, nombre, orden FROM academico_insumos 
         WHERE parcial_id = ? AND estado = 'ACTIVO' ORDER BY tipo, orden`,
        [parciales[0].id]
      );
      
      console.log(`\nInsumos en PARCIAL 1: ${insumos.length}`);
      if (insumos.length === 0) {
        console.log('  (vacío - listo para crear insumos)');
      } else {
        insumos.forEach(i => {
          console.log(`  - ${i.tipo}: ${i.nombre}`);
        });
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
