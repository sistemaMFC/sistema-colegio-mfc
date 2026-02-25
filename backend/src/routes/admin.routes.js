// backend/src/routes/admin.routes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * POST /admin/usuarios
 * Body:
 * {
 *  "nombres": "Juan",
 *  "apellidos": "Perez",
 *  "cedula": "0912345678",
 *  "password": "123456",
 *  "rol": "PROFESOR"  // o "ADMIN"
 * }
 */
router.post("/usuarios", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { nombres, apellidos, cedula, password, rol } = req.body;

    if (!nombres || !apellidos || !cedula || !password) {
      return res.status(400).json({ error: "Faltan datos (nombres, apellidos, cedula, password)" });
    }

    const rolFinal = rol === "ADMIN" ? "ADMIN" : "PROFESOR";

    // validar cedula simple (10 dígitos)
    if (!/^\d{10}$/.test(String(cedula).trim())) {
      return res.status(400).json({ error: "Cédula inválida (debe tener 10 dígitos)" });
    }

    const [exist] = await db.query("SELECT id FROM usuarios WHERE cedula = ? LIMIT 1", [cedula]);
    if (exist.length > 0) {
      return res.status(409).json({ error: "Ya existe un usuario con esa cédula" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // INSERT usuario
    const [result] = await db.query(
      `INSERT INTO usuarios (nombres, apellidos, cedula, password_hash, rol, estado)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO')`,
      [nombres, apellidos, cedula, password_hash, rolFinal]
    );

    const usuarioId = result.insertId;

    // Si es PROFESOR, crea el registro en docentes (vinculado a usuario)
    if (rolFinal === "PROFESOR") {
      await db.query(
        `INSERT INTO docentes (usuario_id, cedula, estado)
         VALUES (?, ?, 'ACTIVO')`,
        [usuarioId, cedula]
      );
    }

    return res.status(201).json({
      message: "Usuario creado correctamente ✅",
      user: { id: usuarioId, nombres, apellidos, cedula, rol: rolFinal }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error creando usuario" });
  }
});

/**
 * GET /admin/usuarios
 * Lista usuarios (sin password)
 */
router.get("/usuarios", authRequired, onlyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombres, apellidos, cedula, rol, estado, created_at
       FROM usuarios
       ORDER BY created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error listando usuarios" });
  }
});

/**
 * PUT /admin/usuarios/:id/estado
 * Body: { "estado": "ACTIVO" | "INACTIVO" }
 */
router.put("/usuarios/:id/estado", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return res.status(400).json({ error: "Estado inválido (ACTIVO o INACTIVO)" });
    }

    await db.query(`UPDATE usuarios SET estado = ? WHERE id = ?`, [estado, id]);

    return res.json({ message: "Estado actualizado ✅", id, estado });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error actualizando estado" });
  }
});

module.exports = router;