const express = require("express");
const pool = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * 1. POST /api/students
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
 * 2. GET /api/students
 * Listar estudiantes con filtro de búsqueda
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
 * 3. PUT /api/students/:id
 * (ADMIN) ACTUALIZADO: Soporta anulación, promoción con curso_id y edición completa
 */
router.put("/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cedula_est, nombres_est, apellidos_est, fecha_nac, genero,
      nombre_rep, cedula_rep, parentesco_rep, celular_rep,
      direccion, sector, estado, curso_id
    } = req.body;

    // --- CASO A: ACTUALIZACIÓN RÁPIDA (Solo estado y/o curso) ---
    // Detectamos si es una acción desde el listado oficial (solo vienen estado y curso_id)
    if (!cedula_est && (estado || curso_id)) {
      console.log(`🔄 Acción rápida ID ${id}: Estado=${estado}, Curso=${curso_id}`);
      
      let sqlRapid = "UPDATE estudiantes SET estado = COALESCE(?, estado), curso_id = COALESCE(?, curso_id) WHERE id = ?";
      let paramsRapid = [estado, curso_id, id];

      if (estado === 'ACTIVO') {
          sqlRapid = "UPDATE estudiantes SET estado = ?, curso_id = COALESCE(?, curso_id), fecha_matricula = NOW() WHERE id = ?";
      }

      const [resRapid] = await pool.query(sqlRapid, paramsRapid);
      if (resRapid.affectedRows === 0) return res.status(404).json({ error: "Estudiante no encontrado" });
      
      return res.json({ success: true, message: `Información de matrícula actualizada ✅` });
    }

    // --- CASO B: EDICIÓN COMPLETA ---
    const sqlFull = `
      UPDATE estudiantes SET
        cedula_est = ?, nombres_est = ?, apellidos_est = ?,
        fecha_nac = ?, genero = ?, nombre_rep = ?,
        cedula_rep = ?, parentesco_rep = ?, celular_rep = ?,
        direccion = ?, sector = ?,
        curso_id = COALESCE(?, curso_id),
        estado = COALESCE(?, estado)
      WHERE id = ?
    `;

    const [result] = await pool.query(sqlFull, [
      cedula_est, nombres_est, apellidos_est, fecha_nac, genero,
      nombre_rep, cedula_rep, parentesco_rep, celular_rep,
      direccion, sector, curso_id || null, estado || null, id
    ]);

    if (result.affectedRows === 0) return res.status(404).json({ error: "Estudiante no encontrado" });

    return res.json({ success: true, message: "Ficha actualizada correctamente 💾" });

  } catch (err) {
    console.error("❌ ERROR CRÍTICO EN PUT /students:", err.message);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * 4. GET /api/students/:id
 * Ver ficha completa de un estudiante
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

/**
 * 5. DELETE /api/students/:id
 * (ADMIN) Eliminar definitivamente de la tabla de estudiantes
 */
router.delete("/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query("DELETE FROM estudiantes WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    console.log(`🗑️ Estudiante ID ${id} eliminado por el administrador.`);
    return res.json({ success: true, message: "Registro eliminado permanentemente de la base de datos." });

  } catch (err) {
    console.error("❌ ERROR AL ELIMINAR:", err.message);
    return res.status(500).json({
        error: "No se puede eliminar el registro porque tiene historial académico o financiero asociado."
    });
  }
});

module.exports = router;