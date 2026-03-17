/* ========================================================
   SERVIDOR PRINCIPAL - COLEGIO MIGUEL FEBRES CORDERO
   ======================================================== */
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// IMPORTACIÓN DE RUTAS
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const studentRoutes = require("./routes/students.routes"); 
const pagosRoutes = require("./routes/pagos.routes"); // <--- NUEVA RUTA DE PAGOS

const app = express();

// MIDDLEWARES GLOBALES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
    REGISTRO DE RUTAS (API)
   ========================= */

// Rutas de Autenticación (Login)
app.use("/auth", authRoutes); 

// Rutas de Administración (Usuarios y Cursos)
app.use("/api/admin", adminRoutes);

// Rutas de Estudiantes y Matrículas
app.use("/api/students", studentRoutes);

// Rutas de Colecturía y Pagos (NUEVO)
app.use("/api/pagos", pagosRoutes); // <--- REGISTRADA AQUÍ ✅

/* =========================
    ARCHIVOS ESTÁTICOS
   ========================= */
// Servir el frontend desde la carpeta pública
app.use(express.static(path.join(__dirname, "../../frontend")));

/* =========================
    MANEJO DE ERRORES 404
   ========================= */
app.use((req, res, next) => {
  console.log(`Ruta no encontrada: ${req.originalUrl}`);
  res.status(404).json({ error: "La ruta solicitada no existe en el servidor" });
});

/* =========================
    ARRANQUE DEL SERVIDOR
   ========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  console.log(`✅ Rutas de administración cargadas en /api/admin`);
  console.log(`✅ Rutas de estudiantes cargadas en /api/students`);
  console.log(`✅ Rutas de pagos cargadas en /api/pagos`); // Confirmación en consola
});

module.exports = app;