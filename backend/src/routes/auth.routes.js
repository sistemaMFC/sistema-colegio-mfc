const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

/**
 * POST /auth/login
 * PRUEBA DE DIAGNÓSTICO: Comparación directa de texto y logs de búsqueda
 */
router.post('/login', async (req, res) => {
  try {
    const { cedula, password } = req.body;

    // Validación de entrada
    if (!cedula || !password) {
      return res.status(400).json({ error: 'Faltan datos (cedula, password)' });
    }

    // 1. LIMPIEZA DE CÉDULA: Evitamos problemas de espacios o tipos de datos
    const cedulaLimpia = String(cedula).trim();

    // 2. CONSULTA A LA BASE DE DATOS
    const [rows] = await pool.query(
      "SELECT id, nombres, apellidos, cedula, password_hash, rol, estado FROM usuarios WHERE TRIM(cedula) = ? LIMIT 1",
      [cedulaLimpia]
    );

    /* ========================================================
       🔍 LÍNEA DE DIAGNÓSTICO (Mírela en los Logs de Render)
       ======================================================== */
    console.log(`🔎 INTENTO LOGIN: Cédula enviada [${cedulaLimpia}] | Encontrados en DB: ${rows.length}`);
    /* ======================================================== */

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // 3. VERIFICACIÓN DE ESTADO
    if (user.estado !== 'ACTIVO') {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // 4. COMPARACIÓN DIRECTA (Texto contra Texto)
    // Usamos String() para asegurar que compare caracteres, no números.
    if (String(password) !== String(user.password_hash)) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // 5. ACTUALIZAR ÚLTIMO LOGIN
    await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [user.id]);

    // 6. GENERAR TOKEN JWT
    const token = jwt.sign(
      { id: user.id, rol: user.rol, cedula: user.cedula },
      process.env.JWT_SECRET || 'secret_mfc_2026',
      { expiresIn: '8h' }
    );

    // 7. RESPUESTA EXITOSA
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
    console.error("❌ Error grave en login:", error);
    return res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

module.exports = router;