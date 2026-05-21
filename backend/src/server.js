/* ========================================================
   SERVIDOR PRINCIPAL - COLEGIO MIGUEL FEBRES CORDERO
   ======================================================== */

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

/* =========================
   IMPORTACIÓN DE RUTAS
   ========================= */

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const studentRoutes = require("./routes/students.routes");
const academicoRoutes = require("./routes/academico.routes");
const pagosRoutes = require("./routes/pagos.routes");

/* =========================
   INICIALIZACIÓN DE APP
   ========================= */

const app = express();

/* =========================
   MIDDLEWARES GLOBALES
   ========================= */

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   REGISTRO DE RUTAS API
   ========================= */

// Rutas de autenticación
app.use("/auth", authRoutes);

// Rutas de administración
app.use("/api/admin", adminRoutes);

// Rutas de estudiantes y matrículas
app.use("/api/students", studentRoutes);

// Rutas académicas
app.use("/api/academico", academicoRoutes);

// Rutas de colecturía y pagos
app.use("/api/pagos", pagosRoutes);

/* =========================
   ARCHIVOS ESTÁTICOS
   ========================= */

app.use(express.static(path.join(__dirname, "../../frontend")));

/* =========================
   RUTA PRINCIPAL DE PRUEBA
   ========================= */

app.get("/", (req, res) => {
  res.send("Servidor del Sistema Colegio Miguel Febres Cordero funcionando correctamente");
});

/* =========================
   MANEJO DE ERRORES 404
   ========================= */

app.use((req, res) => {
  console.log(`Ruta no encontrada: ${req.originalUrl}`);

  res.status(404).json({
    error: "La ruta solicitada no existe en el servidor",
    ruta: req.originalUrl,
  });
});

/* =========================
   ARRANQUE DEL SERVIDOR
   ========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  console.log("✅ Rutas de autenticación cargadas en /auth");
  console.log("✅ Rutas de administración cargadas en /api/admin");
  console.log("✅ Rutas de estudiantes cargadas en /api/students");
  console.log("✅ Rutas académicas cargadas en /api/academico");
  console.log("✅ Rutas de pagos cargadas en /api/pagos");
});

module.exports = app;