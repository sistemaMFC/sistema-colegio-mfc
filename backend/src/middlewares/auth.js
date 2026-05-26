/* ============================================================
   MIDDLEWARE DE AUTENTICACIÓN — COLEGIO MFC
   ✅ CORREGIDO:
      - JWT_SECRET sin fallback 'mfc_secreto_2026'
      - Si no hay variable de entorno el servidor no arranca
   ============================================================ */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET no está definido en el .env');
    process.exit(1);
}

const authRequired = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ error: 'No hay token, acceso denegado' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        const msg = err.name === 'TokenExpiredError'
            ? 'Sesión expirada, inicia sesión nuevamente'
            : 'Token inválido';
        return res.status(401).json({ error: msg });
    }
};

const onlyAdmin = (req, res, next) => {
    if (req.user.rol !== 'ADMIN')
        return res.status(403).json({ error: 'Acceso restringido: Solo Administradores' });
    next();
};

module.exports = { authRequired, onlyAdmin };