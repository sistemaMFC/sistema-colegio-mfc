// backend/src/routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

/**
 * POST /auth/login
 * Body: { cedula, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { cedula, password } = req.body;

    if (!cedula || !password) {
      return res.status(400).json({ error: 'Faltan datos (cedula, password)' });
    }

    const cedulaLimpia = String(cedula).trim();

    const [rows] = await pool.query(
      `SELECT id, nombres, apellidos, cedula, password_hash, rol, estado
       FROM usuarios
       WHERE cedula = ?
       LIMIT 1`,
      [cedulaLimpia]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];

    if (user.estado !== 'ACTIVO') {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, rol: user.rol, cedula: user.cedula },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Login correcto ✅',
      token,
      user: {
        id: user.id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        cedula: user.cedula,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en login' });
  }
});

module.exports = router;