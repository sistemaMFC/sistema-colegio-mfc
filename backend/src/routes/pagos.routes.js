const express = require("express");
const router = express.Router();
const pagosController = require("../controllers/pagos.controller");

// IMPORTANTE: El nombre ":id" debe coincidir con req.params.id en el controlador
router.get("/estado/:id", pagosController.getDeudas);
router.post("/cobrar", pagosController.registrarPago);

module.exports = router;