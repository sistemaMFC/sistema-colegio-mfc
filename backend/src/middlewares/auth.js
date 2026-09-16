/* ============================================================
   MIDDLEWARE DE AUTENTICACIÓN — COLEGIO MFC
   ✅ CORREGIDO:
      - JWT_SECRET sin fallback inseguro
      - Si no hay variable de entorno el servidor no arranca
   ============================================================ */
const jwt = require('jsonwebtoken');
const { normalizeRoles, hasAnyRole } = require('../utils/roles');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET no está definido en el .env');
    process.exit(1);
}

const normalizeUserRoles = (user = {}) => {
    if (!user) return [];
    const roles = Array.isArray(user.roles) ? user.roles : [];
    const legacyRole = user.rol ? String(user.rol).toUpperCase() : null;
    return normalizeRoles(legacyRole, roles);
};

const authRequired = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ error: 'No hay token, acceso denegado' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            ...decoded,
            roles: normalizeUserRoles(decoded),
        };
        next();
    } catch (err) {
        const msg = err.name === 'TokenExpiredError'
            ? 'Sesión expirada, inicia sesión nuevamente'
            : 'Token inválido';
        return res.status(401).json({ error: msg });
    }
};

const hasRole = (user, roleName) => {
    const target = String(roleName || '').toUpperCase();
    if (!target) return false;
    return normalizeUserRoles(user).includes(target);
};

const onlyAdmin = (req, res, next) => {
    if (!hasRole(req.user, 'ADMIN'))
        return res.status(403).json({ error: 'Acceso restringido: Solo Administradores' });
    next();
};

const requireAnyRole = (allowedRoles = []) => (req, res, next) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!hasAnyRole(req.user, roles)) {
        return res.status(403).json({ error: 'Acceso restringido: permisos insuficientes' });
    }
    next();
};

module.exports = {
    authRequired,
    onlyAdmin,
    requireAnyRole,
    hasRole,
    normalizeUserRoles,
};
