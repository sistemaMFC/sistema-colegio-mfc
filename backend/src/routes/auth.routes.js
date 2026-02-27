const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { cedula, password } = req.body;
    const cedulaLimpia = String(cedula).trim();

    // 1. Buscamos al usuario
    const [rows] = await pool.query(
      "SELECT id, nombres, apellidos, cedula, password_hash, rol, estado FROM usuarios WHERE TRIM(cedula) = ? LIMIT 1",
      [cedulaLimpia]
    );

    /* ========================================================
       🔍 CÓDIGO DE INSPECCIÓN (Solo para copiar y ver en logs)
       ======================================================== */
    if (rows.length > 0) {
        const u = rows[0];
        console.log("------------------------------------------");
        console.log("✅ USUARIO ENCONTRADO EN TABLA:");
        console.log(`- Cédula en DB: [${u.cedula}]`);
        console.log(`- Clave en DB: [${u.password_hash}]`);
        console.log(`- Estado en DB: [${u.estado}]`);
        console.log(`- Comparando contra: [${password}]`);
        console.log("------------------------------------------");
    } else {
        console.log(`❌ NO SE ENCONTRÓ NADIE con cédula: [${cedulaLimpia}]`);
    }
    /* ======================================================== */

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // Validación de estado
    if (user.estado !== 'ACTIVO') {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    // COMPARACIÓN DE TEXTO PLANO
    if (String(password) !== String(user.password_hash)) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Generar el Token
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
    console.error("❌ Error en el servidor:", error);
    return res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;