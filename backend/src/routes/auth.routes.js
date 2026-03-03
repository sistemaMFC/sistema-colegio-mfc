const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { cedula, password } = req.body;
        const cedulaLimpia = String(cedula).trim();

        // Buscamos al usuario (con TRIM para ser exactos)
        const [rows] = await pool.query(
            "SELECT id, nombres, apellidos, cedula, password_hash, rol, estado FROM usuarios WHERE TRIM(cedula) = ? LIMIT 1",
            [cedulaLimpia]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Cédula no registrada' });
        }

        const user = rows[0];

        if (user.estado !== 'ACTIVO') {
            return res.status(403).json({ error: 'Usuario inactivo' });
        }

        // Comparación de texto plano (123456 == 123456)
        if (String(password) !== String(user.password_hash)) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Generar Token con la clave de Render
        const secreto = process.env.JWT_SECRET || 'mfc_secreto_2026';
        const token = jwt.sign(
            { id: user.id, rol: user.rol, cedula: user.cedula },
            secreto,
            { expiresIn: '8h' }
        );

        return res.json({
            message: 'Login correcto ✅',
            token,
            user: {
                id: user.id,
                nombres: user.nombres,
                apellidos: user.apellidos,
                rol: user.rol
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;