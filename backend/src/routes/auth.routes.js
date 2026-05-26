const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // <--- NUEVO: Librería para comparar contraseñas encriptadas
const pool = require('../db');
const { authRequired } = require('../middlewares/auth');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET no está definido en el entorno');
    process.exit(1);
}

router.post('/login', async (req, res) => {
    try {
        const { cedula, password } = req.body;

        if (!cedula || !password) {
            return res.status(400).json({ error: 'Cédula y contraseña son obligatorias' });
        }
        
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
        const token = jwt.sign(
            { 
                id: user.id, 
                rol: user.rol, 
                cedula: user.cedula.trim() 
            },
            JWT_SECRET,
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

router.get('/me', authRequired, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, nombres, apellidos, cedula, rol, estado
             FROM usuarios
             WHERE id = ? LIMIT 1`,
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        return res.json(rows[0]);
    } catch (err) {
        console.error('Error en GET /auth/me:', err);
        return res.status(500).json({ error: 'Error al consultar perfil' });
    }
});

router.put('/me', authRequired, async (req, res) => {
    try {
        const { nombres, apellidos, cedula } = req.body;

        if (!nombres || !apellidos || !cedula) {
            return res.status(400).json({ error: 'Nombres, apellidos y cedula son obligatorios' });
        }

        const cedulaLimpia = String(cedula).trim();
        if (!/^\d{10}$/.test(cedulaLimpia)) {
            return res.status(400).json({ error: 'La cedula debe tener exactamente 10 digitos' });
        }

        const [exists] = await pool.query(
            'SELECT id FROM usuarios WHERE cedula = ? AND id <> ? LIMIT 1',
            [cedulaLimpia, req.user.id]
        );

        if (exists.length) {
            return res.status(409).json({ error: 'Ya existe otro usuario con esa cedula' });
        }

        const nombresLimpio = String(nombres).trim();
        const apellidosLimpio = String(apellidos).trim();

        await pool.query(
            `UPDATE usuarios
             SET nombres = ?, apellidos = ?, cedula = ?
             WHERE id = ?`,
            [nombresLimpio, apellidosLimpio, cedulaLimpia, req.user.id]
        );

        return res.json({
            success: true,
            message: 'Perfil actualizado',
            user: {
                id: req.user.id,
                nombres: nombresLimpio,
                apellidos: apellidosLimpio,
                cedula: cedulaLimpia,
                rol: req.user.rol,
            }
        });
    } catch (err) {
        console.error('Error en PUT /auth/me:', err);
        return res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

router.put('/me/password', authRequired, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Contrasena actual y nueva son obligatorias' });
        }

        if (String(new_password).length < 6) {
            return res.status(400).json({ error: 'La nueva contrasena debe tener al menos 6 caracteres' });
        }

        const [rows] = await pool.query(
            'SELECT password_hash FROM usuarios WHERE id = ? LIMIT 1',
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const ok = await bcrypt.compare(String(current_password), rows[0].password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'La contrasena actual no es correcta' });
        }

        const hash = await bcrypt.hash(String(new_password), 10);
        await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

        return res.json({ success: true, message: 'Contrasena actualizada' });
    } catch (err) {
        console.error('Error en PUT /auth/me/password:', err);
        return res.status(500).json({ error: 'Error al actualizar contrasena' });
    }
});

module.exports = router;
