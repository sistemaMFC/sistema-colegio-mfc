const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * 1. GET /api/admin/cursos/estadisticas
 * Obtiene la lista de cursos con el conteo REAL de matriculados para el Dashboard
 */
router.get("/cursos/estadisticas", authRequired, onlyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.id, 
        c.nombre, 
        COUNT(e.id) AS total_matriculados
      FROM cursos c
      LEFT JOIN estudiantes e ON c.id = e.curso_id AND e.estado = 'ACTIVO'
      GROUP BY c.id, c.nombre
      ORDER BY c.orden ASC
    `);

    return res.json(rows);
  } catch (err) {
    console.error("❌ Error cargando estadísticas de cursos:", err);
    return res.status(500).json({ error: "Error al obtener datos de cursos" });
  }
});

/**
 * 2. POST /api/admin/usuarios
 * (ADMIN) Crea administradores, colectores o secretarias con contraseña encriptada
 */
router.post("/usuarios", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { nombres, apellidos, cedula, password, rol } = req.body;

    if (!nombres || !apellidos || !cedula || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios (Nombres, Cédula, Password)" });
    }

    const cedulaLimpia = String(cedula).trim();
    if (!/^\d{10}$/.test(cedulaLimpia)) {
      return res.status(400).json({ error: "La cédula debe tener exactamente 10 dígitos" });
    }

    const [exist] = await db.query("SELECT id FROM usuarios WHERE cedula = ? LIMIT 1", [cedulaLimpia]);
    if (exist.length > 0) {
      return res.status(409).json({ error: "Ya existe un usuario registrado con esa cédula" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rolFinal = rol ? rol.toUpperCase() : "SECRETARIA";

    const [result] = await db.query(
      `INSERT INTO usuarios (nombres, apellidos, cedula, password_hash, rol, estado)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO')`,
      [nombres, apellidos, cedulaLimpia, hashedPassword, rolFinal]
    );

    return res.status(201).json({
      success: true,
      message: "Usuario creado correctamente ✅",
      user: { id: result.insertId, nombres, apellidos, cedula: cedulaLimpia, rol: rolFinal }
    });

  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
    return res.status(500).json({ error: "Error interno al procesar el registro" });
  }
});

/**
 * 3. GET /api/admin/usuarios
 * ACTUALIZADO: Se quita 'onlyAdmin' para que el personal autorizado pueda ver la lista.
 * Se mantiene ordenado por apellido para Gloria.
 */
router.get("/usuarios", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombres, apellidos, cedula, rol, estado, created_at
       FROM usuarios
       ORDER BY apellidos ASC`
    );
    
    // IMPORTANTE: Retornar siempre un array para que el frontend no falle
    return res.json(rows || []);
  } catch (err) {
    console.error("❌ Error al listar usuarios:", err);
    return res.status(500).json({ error: "Error al obtener la lista de personal" });
  }
});

/**
 * 4. PUT /api/admin/usuarios/:id/estado
 * (ADMIN) Permite activar o desactivar personal (Baja administrativa)
 */
router.put("/usuarios/:id/estado", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return res.status(400).json({ error: "Estado inválido (Solo ACTIVO o INACTIVO)" });
    }

    const [result] = await db.query(`UPDATE usuarios SET estado = ? WHERE id = ?`, [estado, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json({ success: true, message: "Estado de usuario actualizado ✅", id, estado });
  } catch (err) {
    console.error("❌ Error al actualizar estado del usuario:", err);
    return res.status(500).json({ error: "Error interno al actualizar estado" });
  }
});

module.exports = router;