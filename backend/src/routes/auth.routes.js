// backend/src/routes/admin.routes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

/**
 * RUTA DE ESTADÍSTICAS (Corregida para asegurar lectura de Railway)
 */
router.get("/cursos/estadisticas", authRequired, onlyAdmin, async (req, res) => {
  try {
    // Forzamos una consulta simple primero para verificar conexión
    const [rows] = await db.query(`
      SELECT 
        c.id, 
        c.nombre, 
        (SELECT COUNT(*) FROM estudiantes e WHERE e.curso_id = c.id) AS total_matriculados
      FROM cursos c
      WHERE c.estado = 'ACTIVO'
      ORDER BY c.orden ASC
    `);

    // DEBUG: Imprimimos en la consola de Render para ver qué llega
    console.log("Cursos encontrados en DB:", rows.length);

    return res.json(rows);
  } catch (err) {
    console.error("ERROR CRÍTICO EN DB:", err.message);
    return res.status(500).json({ error: "Error al leer la tabla cursos" });
  }
});

// --- RESTO DE SUS RUTAS DE USUARIOS (Mantenidas íntegras) ---

router.post("/usuarios", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { nombres, apellidos, cedula, password, rol } = req.body;
    if (!nombres || !apellidos || !cedula || !password) {
      return res.status(400).json({ error: "Faltan datos" });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO usuarios (nombres, apellidos, cedula, password_hash, rol, estado)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO')`,
      [nombres, apellidos, cedula, password_hash, rol || 'PROFESOR']
    );
    return res.status(201).json({ message: "Usuario creado ✅", id: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error creando usuario" });
  }
});

router.get("/usuarios", authRequired, onlyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, nombres, apellidos, cedula, rol, estado FROM usuarios");
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Error listando" });
  }
});

module.exports = router;