// backend/src/routes/students.routes.js
const express = require("express");
const pool = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * POST /students
 * (ADMIN) Crear estudiante
 * Body: { nombres, apellidos, cedula?, fecha_nacimiento?, sexo?, direccion?, telefono?, email? }
 */
router.post("/", authRequired, onlyAdmin, async (req, res) => {
  try {
    const {
      nombres,
      apellidos,
      cedula = null,
      fecha_nacimiento = null,
      sexo = null,
      direccion = null,
      telefono = null,
      email = null
    } = req.body;

    if (!nombres || !apellidos) {
      return res.status(400).json({ error: "Faltan datos (nombres, apellidos)" });
    }

    // cedula opcional, si viene validar 10 dígitos
    if (cedula && !/^\d{10}$/.test(String(cedula).trim())) {
      return res.status(400).json({ error: "Cédula inválida (10 dígitos)" });
    }

    if (cedula) {
      const [exist] = await pool.query(
        "SELECT id FROM estudiantes WHERE cedula = ? LIMIT 1",
        [cedula]
      );
      if (exist.length > 0) {
        return res.status(409).json({ error: "Ya existe un estudiante con esa cédula" });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO estudiantes
        (nombres, apellidos, cedula, fecha_nacimiento, sexo, direccion, telefono, email, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
      [nombres, apellidos, cedula, fecha_nacimiento, sexo, direccion, telefono, email]
    );

    return res.status(201).json({
      message: "Estudiante creado ✅",
      estudiante: { id: result.insertId, nombres, apellidos, cedula }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error creando estudiante" });
  }
});

/**
 * GET /students
 * (ADMIN/PROFESOR) Listar estudiantes (búsqueda opcional)
 * Query: ?q=texto
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    let sql = `
      SELECT id, nombres, apellidos, cedula, fecha_nacimiento, sexo, telefono, email, estado, created_at
      FROM estudiantes
    `;
    const params = [];

    if (q) {
      sql += ` WHERE nombres LIKE ? OR apellidos LIKE ? OR cedula LIKE ? `;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT 200`;

    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error listando estudiantes" });
  }
});

/**
 * GET /students/:id
 */
router.get("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT * FROM estudiantes WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: "No existe" });

    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error consultando estudiante" });
  }
});

/**
 * PUT /students/:id
 * (ADMIN) Actualizar estudiante
 */
router.put("/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombres,
      apellidos,
      cedula = null,
      fecha_nacimiento = null,
      sexo = null,
      direccion = null,
      telefono = null,
      email = null,
      estado = "ACTIVO"
    } = req.body;

    if (!nombres || !apellidos) {
      return res.status(400).json({ error: "Faltan datos (nombres, apellidos)" });
    }

    if (cedula && !/^\d{10}$/.test(String(cedula).trim())) {
      return res.status(400).json({ error: "Cédula inválida (10 dígitos)" });
    }

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    // evitar duplicar cédula en otro estudiante
    if (cedula) {
      const [exist] = await pool.query(
        "SELECT id FROM estudiantes WHERE cedula = ? AND id <> ? LIMIT 1",
        [cedula, id]
      );
      if (exist.length > 0) {
        return res.status(409).json({ error: "Otra persona ya tiene esa cédula" });
      }
    }

    await pool.query(
      `UPDATE estudiantes
       SET nombres=?, apellidos=?, cedula=?, fecha_nacimiento=?, sexo=?, direccion=?, telefono=?, email=?, estado=?
       WHERE id=?`,
      [nombres, apellidos, cedula, fecha_nacimiento, sexo, direccion, telefono, email, estado, id]
    );

    return res.json({ message: "Estudiante actualizado ✅" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error actualizando estudiante" });
  }
});

module.exports = router;