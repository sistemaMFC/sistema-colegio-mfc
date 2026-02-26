const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// IMPORTACIÓN DE RUTAS
const authRoutes = require("./routes/auth.routes");
const setupRoutes = require("./routes/setup.routes");
const adminRoutes = require("./routes/admin.routes");
const studentsRoutes = require("./routes/students.routes");
const enrollmentsRoutes = require("./routes/enrollments.routes");

const app = express();

/* ===========================
    CONFIGURACIÓN GENERAL
=========================== */
// Permitimos que el frontend en Render se comunique con el backend
app.use(cors({
  origin: "https://sistema-colegio-mfc.onrender.com",
  credentials: true
}));
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
// Subimos dos niveles desde 'src' para encontrar la carpeta 'frontend'
const FRONTEND_PATH = path.join(__dirname, "../../frontend");
app.use(express.static(FRONTEND_PATH));

/**
 * Rutas de navegación
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "login.html"));
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "app.html"));
});

app.get("/api", (req, res) => {
  res.json({
    message: "Sistema Colegio Miguel Febres Cordero API funcionando 🚀",
    version: "1.0.0",
  });
});

/* ===========================
    MANEJO DE ERRORES
========================== */
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  console.error("Error global detectado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

/* ===========================
    SERVIDOR
=========================== */
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});