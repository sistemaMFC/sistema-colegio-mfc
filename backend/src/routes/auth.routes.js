const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { cedula, password } = req.body;
    const cedulaLimpia = String(cedula).trim();

    // 1. Buscamos al usuario (con TRIM para evitar espacios)
    const [rows] = await pool.query(
      "SELECT id, nombres, apellidos, cedula, password_hash, rol, estado FROM usuarios WHERE TRIM(cedula) = ? LIMIT 1",
      [cedulaLimpia]
    );

    // LOG DE INSPECCIÓN: Para ver en Render qué está pasando
    if (rows.length > 0) {
        console.log(`🔎 LOGIN: Usuario [${cedulaLimpia}] encontrado. Validando clave...`);
    } else {
        console.log(`❌ LOGIN: Cédula [${cedulaLimpia}] NO existe en la base de datos.`);
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];

    // 2. Verificación de contraseña (TEXTO PLANO como usted pidió)
    if (String(password) !== String(user.password_hash)) {
      console.log(`❌ LOGIN: Clave incorrecta para [${cedulaLimpia}]`);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3. GENERACIÓN DEL TOKEN (Usando su clave de Render)
    // Usamos exactamente 'mfc_secreto_2026' para que coincida con su captura
    const secreto = process.env.JWT_SECRET || 'mfc_secreto_2026';
    
    const token = jwt.sign(
      { id: user.id, rol: user.rol, cedula: user.cedula },
      secreto,
      { expiresIn: '8h' }
    );

    console.log(`✅ LOGIN EXITOSO: Bienvenido ${user.nombres}`);

    return res.json({
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
    console.error("❌ ERROR CRÍTICO:", error);
    return res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;