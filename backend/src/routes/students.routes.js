const express = require("express");
const pool = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * POST /api/students
 * (ADMIN) Registrar Matrícula Nueva
 */
router.post("/", authRequired, onlyAdmin, async (req, res) => {
  try {
    const {
      cedula_est, nombres_est, apellidos_est, fecha_nac, genero,
      nombre_rep, cedula_rep, parentesco_rep, celular_rep,
      direccion, sector, curso_id
    } = req.body;

    if (!cedula_est || !nombres_est || !apellidos_est || !curso_id) {
      return res.status(400).json({ error: "Faltan datos obligatorios (Cédula, Nombres, Curso)" });
    }

    if (!/^\d{10}$/.test(String(cedula_est).trim())) {
      return res.status(400).json({ error: "Cédula del estudiante inválida (debe tener 10 dígitos)" });
    }

    const [exist] = await pool.query(
      "SELECT id FROM estudiantes WHERE cedula_est = ? LIMIT 1",
      [cedula_est]
    );

    if (exist.length > 0) {
      return res.status(409).json({ error: "Ya existe un estudiante registrado con esa cédula" });
    }

    const [result] = await pool.query(
      `INSERT INTO estudiantes
        (cedula_est, nombres_est, apellidos_est, fecha_nac, genero, 
         nombre_rep, cedula_rep, parentesco_rep, celular_rep, 
         direccion, sector, curso_id, estado, periodo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', '2025-2026')`,
      [
        cedula_est, nombres_est, apellidos_est, fecha_nac, genero,
        nombre_rep, cedula_rep, parentesco_rep, celular_rep,
        direccion, sector, curso_id
      ]
    );

    return res.status(201).json({
      success: true,
      message: "¡Matrícula registrada con éxito! ✅",
      id: result.insertId
    });

  } catch (err) {
    console.error("Error en POST /students:", err);
    return res.status(500).json({ error: "Error interno al crear la matrícula" });
  }
});

/**
 * GET /api/students
 * Listar estudiantes (Ahora incluye cedula_rep)
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    let sql = `
      SELECT 
        id, cedula_est, nombres_est, apellidos_est, 
        nombre_rep, cedula_rep, celular_rep, parentesco_rep,
        estado, curso_id, fecha_matricula
      FROM estudiantes
    `;
    const params = [];

    if (q) {
      sql += ` WHERE nombres_est LIKE ? OR apellidos_est LIKE ? OR cedula_est LIKE ? OR cedula_rep LIKE ? `;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY apellidos_est ASC LIMIT 500`;

    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error("Error al listar estudiantes:", err);
    return res.status(500).json({ error: "Error al listar estudiantes" });
  }
});

/**
 * ACTUALIZADO: PUT /api/students/:id
 * (ADMIN) Editar ficha completa o actualizar estado (Anulación/Legalización)
 */
router.put("/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cedula_est, nombres_est, apellidos_est, fecha_nac, genero,
      nombre_rep, cedula_rep, parentesco_rep, celular_rep,
      direccion, sector, estado
    } = req.body;

    // Si solo viene el estado (como en Anulación o Promoción rápida)
    if (estado && Object.keys(req.body).length === 1) {
      const [resEstado] = await pool.query(
        "UPDATE estudiantes SET estado = ?, fecha_matricula = IF(estado='ACTIVO', NOW(), fecha_matricula) WHERE id = ?",
        [estado, id]
      );
      return res.json({ success: true, message: "Estado actualizado correctamente" });
    }

    // Si viene toda la ficha (Edición completa desde el formulario)
    const sql = `
      UPDATE estudiantes SET 
        cedula_est = ?, nombres_est = ?, apellidos_est = ?, 
        fecha_nac = ?, genero = ?, nombre_rep = ?, 
        cedula_rep = ?, parentesco_rep = ?, celular_rep = ?, 
        direccion = ?, sector = ?
      WHERE id = ?
    `;
    
    const [result] = await pool.query(sql, [
      cedula_est, nombres_est, apellidos_est, fecha_nac, genero,
      nombre_rep, cedula_rep, parentesco_rep, celular_rep,
      direccion, sector, id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    return res.json({ success: true, message: "Ficha del estudiante actualizada correctamente 💾" });
  } catch (err) {
    console.error("Error en PUT /students:", err);
    return res.status(500).json({ error: "Error al actualizar los datos" });
  }
});

/**
 * GET /api/students/:id
 * Ver ficha completa
 */
router.get("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`SELECT * FROM estudiantes WHERE id = ?`, [id]);

    if (rows.length === 0) return res.status(404).json({ error: "Estudiante no encontrado" });

    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error al consultar estudiante" });
  }
});

module.exports = router;