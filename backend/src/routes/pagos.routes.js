/* ========================================================
    RUTAS DE PAGOS - COLEGIO MFC
    Define los puntos de acceso para Colecturía
   ======================================================== */
const express = require("express");
const router = express.Router();
const pagosController = require("../controllers/pagos.controller");

// 1. Obtener el semáforo de deudas de un estudiante (Abril - Febrero)
// GET: /api/pagos/estado/42
router.get("/estado/:id", pagosController.getDeudas);

// 2. Procesar el cobro de una pensión, matrícula o inscripción
// POST: /api/pagos/cobrar
router.post("/cobrar", pagosController.registrarPago);

// 3. Generar automáticamente todo el año lectivo (Abril a Febrero)
// POST: /api/pagos/generar-ciclo
router.post("/generar-ciclo", pagosController.generarCicloEscolar);

// 4. Agregar un cargo personalizado o mes extra (Botón de Gloria)
// POST: /api/pagos/agregar-extra
router.post("/agregar-extra", pagosController.agregarExtra);

module.exports = router;