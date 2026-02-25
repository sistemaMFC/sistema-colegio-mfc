const express = require("express");
const pool = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * POST /enrollments
 * (ADMIN) Matricular estudiante + Generación Automática de Cargos (Deudas)
 */
router.post("/", authRequired, onlyAdmin, async (req, res) => {
  const connection = await pool.getConnection(); // Usamos conexión individual para la transacción
  
  try {
    const { estudiante_id, periodo_id, curso_id, paralelo_id, fecha_matricula } = req.body;

    if (!estudiante_id || !periodo_id || !curso_id || !paralelo_id || !fecha_matricula) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Iniciar Transacción: O se hace todo, o no se hace nada
    await connection.beginTransaction();

    // 1. Verificar si ya existe la matrícula
    const [exist] = await connection.query(
      "SELECT id FROM matriculas WHERE estudiante_id=? AND periodo_id=? LIMIT 1",
      [estudiante_id, periodo_id]
    );
    
    if (exist.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Este estudiante ya está matriculado en este periodo" });
    }

    // 2. Insertar la Matrícula 
    const [resultMat] = await connection.query(
      `INSERT INTO matriculas (estudiante_id, periodo_id, curso_id, paralelo_id, fecha_matricula, estado)
       VALUES (?, ?, ?, ?, ?, 'MATRICULADO')`,
      [estudiante_id, periodo_id, curso_id, paralelo_id, fecha_matricula]
    );
    const matriculaId = resultMat.insertId;

    // 3. Generar Cargo de INSCRIPCIÓN ($25.00) [cite: 10, 60]
    await connection.query(
      `INSERT INTO cargos_estudiante 
       (matricula_id, periodo_id, concepto_id, fecha_emision, valor_total, estado) 
       VALUES (?, ?, (SELECT id FROM conceptos_cobro WHERE codigo='INSCRIPCION'), ?, 25.00, 'PENDIENTE')`,
      [matriculaId, periodo_id, fecha_matricula]
    );

    // 4. Generar 10 Cargos de PENSIÓN ($50.00 c/u) [cite: 9, 61]
    // Meses escolares en Ecuador: Mayo (5) a Febrero (2 del año siguiente)
    const mesesPension = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2];
    
    for (const mesId of mesesPension) {
      await connection.query(
        `INSERT INTO cargos_estudiante 
         (matricula_id, periodo_id, concepto_id, mes_id, fecha_emision, valor_total, estado) 
         VALUES (?, ?, (SELECT id FROM conceptos_cobro WHERE codigo='PENSION'), ?, ?, 50.00, 'PENDIENTE')`,
        [matriculaId, periodo_id, mesId, fecha_matricula]
      );
    }

    // Si llegamos aquí sin errores, confirmamos todo en la BD
    await connection.commit();
    return res.status(201).json({ 
      message: "Matrícula exitosa y deudas generadas (Inscripción + 10 Pensiones) ✅", 
      id: matriculaId 
    });

  } catch (err) {
    // Si algo falla, deshacemos cualquier cambio para no dejar datos huérfanos
    await connection.rollback();
    console.error("Error en Transacción de Matrícula:", err);
    return res.status(500).json({ error: "Error procesando la matrícula y cargos" });
  } finally {
    connection.release(); // Liberar la conexión al pool
  }
});

/**
 * GET /enrollments - Listar matrículas con filtros
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const { periodo_id, curso_id, paralelo_id, estado } = req.query;
    let sql = `
      SELECT m.id, CONCAT(e.apellidos, ' ', e.nombres) AS estudiante, e.cedula,
             p.nombre AS periodo, c.nombre AS curso, pr.nombre AS paralelo, 
             m.fecha_matricula, m.estado
      FROM matriculas m
      JOIN estudiantes e ON e.id = m.estudiante_id
      JOIN periodos_lectivos p ON p.id = m.periodo_id
      JOIN cursos c ON c.id = m.curso_id
      JOIN paralelos pr ON pr.id = m.paralelo_id
      WHERE 1=1
    `;
    const params = [];
    if (periodo_id) { sql += " AND m.periodo_id=?"; params.push(periodo_id); }
    if (curso_id) { sql += " AND m.curso_id=?"; params.push(curso_id); }
    if (paralelo_id) { sql += " AND m.paralelo_id=?"; params.push(paralelo_id); }
    if (estado) { sql += " AND m.estado=?"; params.push(estado); }

    sql += " ORDER BY e.apellidos ASC";
    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Error listando matrículas" });
  }
});

/**
 * PUT /enrollments/:id/estado - Actualizar estado
 */
router.put("/:id/estado", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const allowed = ["MATRICULADO", "RETIRADO", "TRANSFERIDO", "GRADUADO"];
    if (!allowed.includes(estado)) return res.status(400).json({ error: "Estado inválido" });

    await pool.query("UPDATE matriculas SET estado=? WHERE id=?", [estado, id]);
    return res.json({ message: "Estado actualizado ✅" });
  } catch (err) {
    return res.status(500).json({ error: "Error actualizando estado" });
  }
});

module.exports = router;