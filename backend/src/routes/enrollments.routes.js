const express = require("express");
const pool = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

async function obtenerPeriodoActivoId() {
  const [rows] = await pool.query(
    "SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1"
  );
  return rows[0]?.id || null;
}

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
 * POST /enrollments/asignar-manual
 * (ADMIN) Ubica manualmente un estudiante en curso/paralelo para el periodo activo.
 * Si ya tiene matricula en el periodo, la mueve al nuevo paralelo.
 */
router.post("/asignar-manual", authRequired, onlyAdmin, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      estudiante_id,
      periodo_id,
      curso_id,
      paralelo_id,
      fecha_matricula,
    } = req.body;

    const periodoFinal = periodo_id || await obtenerPeriodoActivoId();
    const fechaFinal = fecha_matricula || new Date().toISOString().slice(0, 10);

    if (!estudiante_id || !periodoFinal || !curso_id || !paralelo_id) {
      return res.status(400).json({ error: "Faltan estudiante, periodo, curso o paralelo" });
    }

    await connection.beginTransaction();

    const [[estudiante], [curso], [paralelo]] = await Promise.all([
      connection.query("SELECT id FROM estudiantes WHERE id = ? LIMIT 1", [estudiante_id]),
      connection.query("SELECT id FROM cursos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1", [curso_id]),
      connection.query("SELECT id FROM paralelos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1", [paralelo_id]),
    ]);

    if (!estudiante.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    if (!curso.length) {
      await connection.rollback();
      return res.status(400).json({ error: "El curso no esta activo" });
    }
    if (!paralelo.length) {
      await connection.rollback();
      return res.status(400).json({ error: "El paralelo no esta activo" });
    }

    const [exist] = await connection.query(
      "SELECT id FROM matriculas WHERE estudiante_id = ? AND periodo_id = ? LIMIT 1",
      [estudiante_id, periodoFinal]
    );

    let matriculaId;
    if (exist.length) {
      matriculaId = exist[0].id;
      await connection.query(
        `UPDATE matriculas
         SET curso_id = ?, paralelo_id = ?, estado = 'MATRICULADO'
         WHERE id = ?`,
        [curso_id, paralelo_id, matriculaId]
      );
    } else {
      const [result] = await connection.query(
        `INSERT INTO matriculas
         (estudiante_id, periodo_id, curso_id, paralelo_id, fecha_matricula, estado)
         VALUES (?, ?, ?, ?, ?, 'MATRICULADO')`,
        [estudiante_id, periodoFinal, curso_id, paralelo_id, fechaFinal]
      );
      matriculaId = result.insertId;
    }

    await connection.query(
      "UPDATE estudiantes SET curso_id = ?, estado = 'ACTIVO', fecha_matricula = COALESCE(fecha_matricula, NOW()) WHERE id = ?",
      [curso_id, estudiante_id]
    );

    await connection.commit();
    return res.json({
      success: true,
      id: matriculaId,
      message: "Estudiante asignado al curso y paralelo",
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error en asignacion manual:", err);
    return res.status(500).json({ error: "Error al asignar estudiante al paralelo" });
  } finally {
    connection.release();
  }
});

/**
 * POST /enrollments/distribuir
 * (ADMIN) Mueve en bloque matriculas existentes a otro paralelo del mismo curso.
 */
router.post("/distribuir", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { matricula_ids, curso_id, paralelo_id, periodo_id } = req.body;
    const periodoFinal = periodo_id || await obtenerPeriodoActivoId();

    if (!Array.isArray(matricula_ids) || !matricula_ids.length || !curso_id || !paralelo_id || !periodoFinal) {
      return res.status(400).json({ error: "Seleccione estudiantes y paralelo destino" });
    }

    const ids = matricula_ids.map(Number).filter(Number.isFinite);
    if (!ids.length) return res.status(400).json({ error: "Lista de matriculas invalida" });

    const [paralelo] = await pool.query(
      "SELECT id FROM paralelos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1",
      [paralelo_id]
    );
    if (!paralelo.length) return res.status(400).json({ error: "El paralelo no esta activo" });

    const placeholders = ids.map(() => "?").join(",");
    const [result] = await pool.query(
      `UPDATE matriculas
       SET paralelo_id = ?, estado = 'MATRICULADO'
       WHERE id IN (${placeholders})
         AND curso_id = ?
         AND periodo_id = ?
         AND estado IN ('ACTIVO','MATRICULADO')`,
      [paralelo_id, ...ids, curso_id, periodoFinal]
    );

    return res.json({
      success: true,
      message: "Distribucion actualizada",
      moved: result.affectedRows,
    });
  } catch (err) {
    console.error("Error al distribuir matriculas:", err);
    return res.status(500).json({ error: "Error al distribuir estudiantes" });
  }
});

/**
 * GET /enrollments - Listar matrículas con filtros
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const { periodo_id, curso_id, paralelo_id, estado } = req.query;
    let sql = `
      SELECT m.id, m.estudiante_id, m.periodo_id, m.curso_id, m.paralelo_id,
             CONCAT(e.apellidos_est, ' ', e.nombres_est) AS estudiante,
             e.cedula_est AS cedula,
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

    sql += " ORDER BY e.apellidos_est ASC";
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
