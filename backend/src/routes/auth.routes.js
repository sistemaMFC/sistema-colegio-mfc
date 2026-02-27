const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

/**
 * POST /auth/login
 * Acceso directo sin encriptación (bcrypt eliminada)
 */
router.post('/login', async (req, res) => {
  try {
    const { cedula, password } = req.body;

    if (!cedula || !password) {
      return res.status(400).json({ error: 'Faltan datos (cedula, password)' });
    }

    const cedulaLimpia = String(cedula).trim();

    // 1. Buscamos al usuario en la base de datos
    const [rows] = await pool.query(
      `SELECT id, nombres, apellidos, cedula, password_hash, rol, estado 
       FROM usuarios 
       WHERE cedula = ? 
       LIMIT 1`,
      [cedulaLimpia]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // 2. Verificamos si está ACTIVO
    if (user.estado !== 'ACTIVO') {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // 3. COMPARACIÓN DIRECTA (Sin seguridad de encriptación)
    // Comparamos el texto plano enviado con lo que hay en la columna password_hash
    if (password !== user.password_hash) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // 4. Actualizamos último login
    await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [user.id]);

    // 5. Generamos Token JWT para que el frontend pueda navegar
    const token = jwt.sign(
      { id: user.id, rol: user.rol, cedula: user.cedula },
      process.env.JWT_SECRET || 'secret_mfc_2026',
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
    console.error("Error en login:", error);
    return res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

module.exports = router;