const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// IMPORTACIÓN DE TODAS SUS RUTAS ORIGINALES
const authRoutes = require("./routes/auth.routes");
const setupRoutes = require("./routes/setup.routes");
const adminRoutes = require("./routes/admin.routes");
const studentsRoutes = require("./routes/students.routes");
const enrollmentsRoutes = require("./routes/enrollments.routes");

const app = express();

/* ===========================
    CONFIGURACIÓN GENERAL
=========================== */
app.use(cors());
app.use(express.json());

/* ===========================
    RUTAS API
=========================== */
app.use("/auth", authRoutes);
app.use("/setup", setupRoutes);
app.use("/admin", adminRoutes);
app.use("/students", studentsRoutes);
app.use("/enrollments", enrollmentsRoutes);

/* ===========================
    SERVIR FRONTEND (STATIC)
=========================== */
// CORRECCIÓN PARA RAILWAY: Localiza la carpeta 'frontend' desde la raíz del proyecto
const FRONTEND_PATH = path.resolve(process.cwd(), "frontend");
app.use(express.static(FRONTEND_PATH));

/**
 * Ruta raíz: muestra el login (login.html)
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "login.html"));
});

/**
 * Ruta directa para la app administrativa
 */
app.get("/app", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "app.html"));
});

/**
 * Ruta base API para pruebas
 */
app.get("/api", (req, res) => {
  res.json({
    message: "Sistema Colegio Miguel Febres Cordero API funcionando 🚀",
    version: "1.0.0",
  });
});

/* ===========================
    404 (Ruta no encontrada)
=========================== */
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

/* ===========================
    MANEJO GLOBAL DE ERRORES
=========================== */
app.use((err, req, res, next) => {
  console.error("Error global:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

/* ===========================
    SERVIDOR
=========================== */
// Railway asigna automáticamente el puerto, por eso usamos process.env.PORT
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});