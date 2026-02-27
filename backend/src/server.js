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
// Permitimos que su URL de Render tenga acceso total
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
/**
 * SOLUCIÓN PARA RENDER:
 * Usamos path.resolve para encontrar la carpeta frontend subiendo niveles
 * desde la carpeta donde se ejecuta el proceso.
 */
const FRONTEND_PATH = path.resolve(process.cwd(), "..", "frontend");

app.use(express.static(FRONTEND_PATH));

app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "login.html"));
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "app.html"));
});

app.get("/api", (req, res) => {
  res.json({
    message: "Sistema Colegio Miguel Febres Cordero API funcionando 🚀",
  });
});

/* ===========================
    MANEJO DE ERRORES
=========================== */
app.use((err, req, res, next) => {
  console.error("Error detectado:", err.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

/* ===========================
    SERVIDOR
=========================== */
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`✅ Servidor MFC corriendo en el puerto ${PORT}`);
    console.log(`📂 Carpeta frontend buscada en: ${FRONTEND_PATH}`);
});