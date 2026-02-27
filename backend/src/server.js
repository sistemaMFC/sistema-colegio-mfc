const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const setupRoutes = require("./routes/setup.routes");
const adminRoutes = require("./routes/admin.routes");
const studentsRoutes = require("./routes/students.routes");
const enrollmentsRoutes = require("./routes/enrollments.routes");

const app = express();

app.use(cors({
  origin: "https://sistema-colegio-mfc.onrender.com",
  credentials: true
}));
app.use(express.json());

// RUTAS API
app.use("/auth", authRoutes);
app.use("/setup", setupRoutes);
app.use("/admin", adminRoutes);
app.use("/students", studentsRoutes);
app.use("/enrollments", enrollmentsRoutes);

/* ===========================
    SERVIR FRONTEND (STATIC)
=========================== */
// __dirname es 'backend/src'. Subimos dos niveles para llegar a la raíz y entrar a 'frontend'
const FRONTEND_PATH = path.resolve(__dirname, "..", "..", "frontend");

app.use(express.static(FRONTEND_PATH));

app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "index.html")); // Su archivo principal es index.html
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "app.html"));
});

// MANEJO DE ERRORES
app.use((err, req, res, next) => {
  console.error("❌ Error detectado:", err.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Servidor MFC corriendo en el puerto ${PORT}`);
    console.log(`📂 Frontend cargado desde: ${FRONTEND_PATH}`);
});