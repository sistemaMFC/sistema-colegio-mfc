const jwt = require('jsonwebtoken');

const authRequired = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No hay token, acceso denegado' });

    const token = authHeader.split(' ')[1];
    try {
        // Usamos la misma clave que configuró en Render
        const secreto = process.env.JWT_SECRET || 'mfc_secreto_2026';
        const decoded = jwt.verify(token, secreto);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Sesión expirada o token inválido' });
    }
};

const onlyAdmin = (req, res, next) => {
    if (req.user.rol !== 'ADMIN') {
        return res.status(403).json({ error: 'Acceso restringido: Solo Administradores' });
    }
    next();
};

module.exports = { authRequired, onlyAdmin };