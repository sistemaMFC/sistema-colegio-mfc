// backend/src/middlewares/auth.js
const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Token requerido" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, rol, cedula, ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

function onlyAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "No autenticado" });

  if (req.user.rol !== "ADMIN") {
    return res.status(403).json({ error: "Acceso denegado: solo ADMIN" });
  }
  next();
}

module.exports = { authRequired, onlyAdmin };