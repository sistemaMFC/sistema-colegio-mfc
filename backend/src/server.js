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
    CONFIGURACIÓN DE SEGURIDAD
=========================== */
// Permitir que el frontend en Render acceda al backend
app.use(cors({
  origin: "https://sistema-colegio-mfc.onrender.com",
  credentials: true
}));
app.use(express.json());

/* ===========================
    RUTAS DEL SISTEMA
=========================== */
app.use("/auth", authRoutes);
app.use("/setup", setupRoutes);
app.use("/admin", adminRoutes);
app.use("/students", studentsRoutes);
app.use("/enrollments", enrollmentsRoutes);

/* ===========================
    CONTROL DE ARCHIVOS (FRONTEND)
=========================== */
// Localiza la carpeta frontend subiendo dos niveles desde backend/src
const FRONTEND_PATH = path.join(__dirname, "../../frontend");
app.use(express.static(FRONTEND_PATH));

// Ruta para el Login
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "login.html"));
});

// Ruta para la aplicación principal
app.get("/app", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "app.html"));
});

/* ===========================
    MANEJO DE ERRORES
=========================== */
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  console.error("Error en el servidor:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

/* ===========================
    INICIO DEL SERVIDOR
=========================== */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor del Colegio MFC corriendo en puerto ${PORT}`);
});