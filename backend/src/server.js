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
app.use(cors({
  origin: "https://sistema-colegio-mfc.onrender.com",
  credentials: true
}));
app.use(express.json());

/* ===========================
    RUTAS DE LA API
=========================== */
app.use("/auth", authRoutes);
app.use("/setup", setupRoutes);
app.use("/admin", adminRoutes);
app.use("/students", studentsRoutes);
app.use("/enrollments", enrollmentsRoutes);

/* ===========================
    SERVIR FRONTEND (ESTÁTICO)
=========================== */
/**
 * CORREGIDO: Busca los archivos directamente en la raíz del backend
 * ya que no existe la carpeta 'frontend'
 */
const FRONTEND_PATH = path.resolve(process.cwd());

// Servir archivos estáticos (CSS, JS, Imágenes)
app.use(express.static(FRONTEND_PATH));

// Ruta principal - Login (usando index.html en lugar de login.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "index.html"));
});

// Ruta de la aplicación administrativa
app.get("/app", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "app.html"));
});

// Prueba de vida de la API
app.get("/api", (req, res) => {
  res.json({ 
    message: "Sistema Colegio Miguel Febres Cordero API Operativa 🚀",
    status: "online"
  });
});

/* ===========================
    MANEJO GLOBAL DE ERRORES
========================== */
app.use((err, req, res, next) => {
  console.error("❌ Error detectado en el servidor:", err.message);
  res.status(500).json({ 
    error: "Error interno del servidor",
    details: err.message 
  });
});

/* ===========================
    INICIO DEL SERVIDOR
=========================== */
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`✅ Servidor MFC corriendo en el puerto ${PORT}`);
    console.log(`📂 Frontend cargado desde: ${FRONTEND_PATH}`);
});