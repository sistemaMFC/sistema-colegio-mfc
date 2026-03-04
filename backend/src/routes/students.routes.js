const express = require("express");
const pool = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * POST /api/students
 * (ADMIN) Registrar Matrícula Nueva (Gloria)
 * Recibe los datos del estudiante + representante
 */
router.post("/", authRequired, onlyAdmin, async (req, res) => {
  try {
    const {
      cedula_est,
      nombres_est,
      apellidos_est,
      fecha_nac,
      genero,
      nombre_rep,
      cedula_rep,
      parentesco_rep,
      celular_rep,
      direccion,
      sector,
      curso_id
    } = req.body;

    // 1. Validaciones básicas
    if (!cedula_est || !nombres_est || !apellidos_est || !curso_id) {
      return res.status(400).json({ error: "Faltan datos obligatorios (Cédula, Nombres, Curso)" });
    }

    // 2. Validar que la cédula tenga 10 dígitos
    if (!/^\d{10}$/.test(String(cedula_est).trim())) {
      return res.status(400).json({ error: "Cédula del estudiante inválida (debe tener 10 dígitos)" });
    }

    // 3. Verificar si el estudiante ya existe (por cédula)
    const [exist] = await pool.query(
      "SELECT id FROM estudiantes WHERE cedula_est = ? LIMIT 1",
      [cedula_est]
    );

    if (exist.length > 0) {
      return res.status(409).json({ error: "Ya existe un estudiante registrado con esa cédula" });
    }

    // 4. Insertar en la base de datos (Nueva estructura)
    const [result] = await pool.query(
      `INSERT INTO estudiantes
        (cedula_est, nombres_est, apellidos_est, fecha_nac, genero, 
         nombre_rep, cedula_rep, parentesco_rep, celular_rep, 
         direccion, sector, curso_id, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
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
 * Listar estudiantes con la nueva estructura
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    let sql = `
      SELECT id, cedula_est, nombres_est, apellidos_est, nombre_rep, celular_rep, estado, fecha_matricula
      FROM estudiantes
    `;
    const params = [];

    if (q) {
      sql += ` WHERE nombres_est LIKE ? OR apellidos_est LIKE ? OR cedula_est LIKE ? `;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY fecha_matricula DESC LIMIT 200`;

    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error al listar estudiantes" });
  }
});

/**
 * GET /api/students/:id
 * Ver ficha completa (incluye representante)
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