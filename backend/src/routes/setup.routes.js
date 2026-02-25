// backend/src/routes/setup.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

/**
 * POST /setup/admin
 * Crea el primer ADMIN si no existe ninguno.
 * Body: { nombres, apellidos, cedula, password }
 */
router.post('/admin', async (req, res) => {
  try {
    const { nombres, apellidos, cedula, password } = req.body;

    if (!nombres || !apellidos || !cedula || !password) {
      return res.status(400).json({
        error: 'Faltan datos (nombres, apellidos, cedula, password)'
      });
    }

    // validar cedula simple (10 dígitos)
    if (!/^\d{10}$/.test(String(cedula).trim())) {
      return res.status(400).json({ error: 'Cédula inválida (debe tener 10 dígitos)' });
    }

    // ¿Ya existe un admin?
    const [admins] = await pool.query("SELECT id FROM usuarios WHERE rol='ADMIN' LIMIT 1");
    if (admins.length > 0) {
      return res.status(409).json({
        error: 'Ya existe un ADMIN. Este endpoint solo sirve 1 vez.'
      });
    }

    // ¿Cédula ya existe?
    const [existe] = await pool.query(
      "SELECT id FROM usuarios WHERE cedula = ? LIMIT 1",
      [cedula]
    );
    if (existe.length > 0) {
      return res.status(409).json({ error: 'Esa cédula ya está registrada' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO usuarios (nombres, apellidos, cedula, password_hash, rol, estado)
       VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVO')`,
      [nombres, apellidos, cedula, password_hash]
    );

    return res.json({ message: 'ADMIN creado correctamente ✅' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error creando admin' });
  }
});

module.exports = router;