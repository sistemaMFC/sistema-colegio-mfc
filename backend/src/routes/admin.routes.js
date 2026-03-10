const express = require("express");
const bcrypt = require("bcrypt"); // Cambiado a bcrypt para consistencia con auth.routes
const db = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * GET /api/admin/cursos/estadisticas
 * Obtiene la lista de cursos con el conteo real de matriculados
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
    console.error("Error cargando estadísticas de cursos:", err);
    return res.status(500).json({ error: "Error al obtener datos de cursos" });
  }
});

/**
 * POST /api/admin/usuarios
 * Crea administradores, colectores o secretarias con contraseña encriptada
 */
router.post("/usuarios", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { nombres, apellidos, cedula, password, rol } = req.body;

    // 1. Validaciones básicas
    if (!nombres || !apellidos || !cedula || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios (nombres, apellidos, cedula, password)" });
    }

    // 2. Validar formato de cédula (10 dígitos)
    const cedulaLimpia = String(cedula).trim();
    if (!/^\d{10}$/.test(cedulaLimpia)) {
      return res.status(400).json({ error: "La cédula debe tener exactamente 10 dígitos numéricos" });
    }

    // 3. Verificar si el usuario ya existe
    const [exist] = await db.query("SELECT id FROM usuarios WHERE TRIM(cedula) = ? LIMIT 1", [cedulaLimpia]);
    if (exist.length > 0) {
      return res.status(409).json({ error: "Ya existe un usuario registrado con esa cédula" });
    }

    // 4. ENCRIPTACIÓN DE CONTRASEÑA (BCRYPT)
    // Esto transforma "123456" en el código largo que viste en la base de datos
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 5. Definir el rol (Acepta los del frontend: ADMIN, COLECTOR, SECRETARIA)
    const rolFinal = rol ? rol.toUpperCase() : "SECRETARIA";

    // 6. Insertar en la tabla 'usuarios'
    const [result] = await db.query(
      `INSERT INTO usuarios (nombres, apellidos, cedula, password_hash, rol, estado)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO')`,
      [nombres, apellidos, cedulaLimpia, hashedPassword, rolFinal]
    );

    const usuarioId = result.insertId;

    return res.status(201).json({
      message: "Usuario creado correctamente ✅",
      user: { id: usuarioId, nombres, apellidos, cedula: cedulaLimpia, rol: rolFinal }
    });

  } catch (err) {
    console.error("Error al crear usuario:", err);
    return res.status(500).json({ error: "Error interno al crear el usuario" });
  }
});

/**
 * GET /api/admin/usuarios
 * Lista todos los usuarios registrados
 */
router.get("/usuarios", authRequired, onlyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nombres, apellidos, cedula, rol, estado, created_at
       FROM usuarios
       ORDER BY id DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error("Error al listar usuarios:", err);
    return res.status(500).json({ error: "Error al listar usuarios" });
  }
});

/**
 * PUT /api/admin/usuarios/:id/estado
 * Actualiza el estado (ACTIVO / INACTIVO) para bloquear accesos
 */
router.put("/usuarios/:id/estado", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return res.status(400).json({ error: "Estado inválido. Use ACTIVO o INACTIVO" });
    }

    const [result] = await db.query(`UPDATE usuarios SET estado = ? WHERE id = ?`, [estado, id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json({ message: "Estado de usuario actualizado ✅", id, estado });
  } catch (err) {
    console.error("Error al actualizar estado:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;