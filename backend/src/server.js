const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
// Importe aquí las otras rutas si las tiene (admin, students, etc.)

const app = express();

app.use(cors());
app.use(express.json());

// RUTAS API
app.use("/auth", authRoutes);

// SERVIR FRONTEND
const FRONTEND_PATH = path.resolve(__dirname, "..", "..", "frontend");
app.use(express.static(FRONTEND_PATH));

app.get("*", (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`✅ Servidor MFC corriendo en puerto ${PORT}`);
});