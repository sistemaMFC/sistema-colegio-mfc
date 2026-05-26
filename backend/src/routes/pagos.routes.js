/* ============================================================
   RUTAS DE PAGOS — COLEGIO MFC
   ✅ CORREGIDO: Todas las rutas requieren autenticación.
   Antes cualquier persona con la URL podía cobrar o
   generar deudas sin estar logueada.
   ============================================================ */
const express         = require('express');
const router          = express.Router();
const pagosController = require('../controllers/pagos.controller');
const { authRequired } = require('../middlewares/auth');

// Solo ADMIN y COLECTOR pueden gestionar pagos
const soloColector = (req, res, next) => {
    if (['ADMIN', 'COLECTOR', 'SECRETARIA'].includes(req.user.rol)) return next();
    return res.status(403).json({ error: 'Acceso restringido a Colecturía' });
};

// GET /api/pagos/estado/:id — semáforo de deudas
router.get('/estado/:id',    authRequired, soloColector, pagosController.getDeudas);

// POST /api/pagos/cobrar — registrar un cobro
router.post('/cobrar',       authRequired, soloColector, pagosController.registrarPago);

// POST /api/pagos/generar-ciclo — generar ciclo escolar
router.post('/generar-ciclo', authRequired, soloColector, pagosController.generarCicloEscolar);

// POST /api/pagos/agregar-extra — cargo extra
router.post('/agregar-extra', authRequired, soloColector, pagosController.agregarExtra);

module.exports = router;