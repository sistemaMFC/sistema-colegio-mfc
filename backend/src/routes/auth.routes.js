const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // <--- NUEVO: Librería para comparar contraseñas encriptadas
const pool = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { cedula, password } = req.body;
        
        // Limpiamos los datos de entrada
        const cedulaLimpia = String(cedula).trim();
        const passwordLimpia = String(password);

        // 1. Buscamos al usuario por su cédula
        const [rows] = await pool.query(
            "SELECT id, nombres, apellidos, cedula, password_hash, rol, estado FROM usuarios WHERE TRIM(cedula) = ? LIMIT 1",
            [cedulaLimpia]
        );

        // 2. Si no existe la cédula
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Cédula no registrada' });
        }

        const user = rows[0];

        // 3. Verificamos si el usuario está activo
        if (user.estado !== 'ACTIVO') {
            return res.status(403).json({ error: 'Usuario inactivo. Contacte al administrador.' });
        }

        // 4. COMPARACIÓN DE SEGURIDAD CON BCRYPT
        // Comparamos el texto plano (123456) con el hash encriptado de la BD
        const esValida = await bcrypt.compare(passwordLimpia, user.password_hash);

        if (!esValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // 5. Generar Token JWT (Usando secreto de Render o local)
        const secreto = process.env.JWT_SECRET || 'mfc_secreto_2026';
        const token = jwt.sign(
            { 
                id: user.id, 
                rol: user.rol, 
                cedula: user.cedula.trim() 
            },
            secreto,
            { expiresIn: '8h' }
        );

        // 6. Respuesta exitosa
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
        console.error("Error en Login:", err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;