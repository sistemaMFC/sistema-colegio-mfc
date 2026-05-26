/* ============================================================
   SERVIDOR PRINCIPAL — COLEGIO MFC
   ✅ CORREGIDO:
      - Rutas de pagos ahora requieren login (authRequired)
      - enrollments.routes.js y setup.routes.js registrados
      - Ruta para portal del profesor (/api/profesor)
      - CORS restringido en producción
      - Límite de payload 1MB
   ============================================================ */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

/* ── Middlewares ── */
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ── Rutas ── */
const authRoutes        = require('./routes/auth.routes');
const adminRoutes       = require('./routes/admin.routes');
const studentRoutes     = require('./routes/students.routes');
const academicoRoutes   = require('./routes/academico.routes');
const pagosRoutes       = require('./routes/pagos.routes');
const enrollmentsRoutes = require('./routes/enrollments.routes');
const profesorRoutes = require('./routes/profesor.routes');

app.use('/auth',            authRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/students',    studentRoutes);
app.use('/api/academico',   academicoRoutes);
app.use('/api/pagos',       pagosRoutes);         // ✅ protegido internamente con authRequired
app.use('/api/enrollments', enrollmentsRoutes);   // ✅ ya no estaba registrado
app.use('/api/profesor', profesorRoutes);      // ✅ portal del profesor

/* ── Estáticos ── */
app.use(express.static(path.join(__dirname, '../../frontend')));

/* ── 404 ── */
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada', ruta: req.originalUrl });
});

/* ── Error global ── */
app.use((err, req, res, next) => {
    console.error('❌ Error no controlado:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto ${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;