const express = require("express");
const router = express.Router();
const pagosController = require("../controllers/pagos.controller");

// Ruta para ver qué debe el alumno
router.get("/estado/:id", pagosController.getDeudas);

// Ruta para cobrar
router.post("/cobrar", pagosController.registrarPago);

module.exports = router;