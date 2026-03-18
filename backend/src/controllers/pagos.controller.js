/* ========================================================
    CONTROLADOR DE PAGOS - COLEGIO MFC
    Manejo de Ciclo Escolar (Abril-Feb), Pensiones y Extras
   ======================================================== */
const db = require("../db");

const pagosController = {
    /**
     * 1. Obtener deudas (El Semáforo)
     */
    getDeudas: async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await db.query(
                `SELECT 
                    id, 
                    estudiante_id, 
                    COALESCE(mes_nombre, 'Pensión') as mes_nombre, 
                    COALESCE(monto_pendiente, 40.00) as monto_pendiente, 
                    COALESCE(estado, 'PENDIENTE') as estado
                 FROM cargos_estudiante 
                 WHERE estudiante_id = ? 
                 ORDER BY id ASC`,
                [id]
            );
            res.json(rows || []);
        } catch (err) {
            console.error("❌ ERROR EN GET_DEUDAS:", err.message);
            res.json([]); 
        }
    },

    /**
     * 2. Registrar un Pago (Inscripción, Matrícula o Pensión)
     */
    registrarPago: async (req, res) => {
        const { estudiante_id, concepto, monto, mes_id, metodo_pago } = req.body;
        
        if (!estudiante_id || !concepto || !monto) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        try {
            await db.query("START TRANSACTION");

            // A. Registrar en tabla pagos
            const [resultado] = await db.query(
                `INSERT INTO pagos (estudiante_id, concepto, monto, metodo_pago, fecha_pago) 
                 VALUES (?, ?, ?, ?, NOW())`,
                [estudiante_id, concepto, monto, metodo_pago || 'EFECTIVO']
            );

            const nuevoPagoId = resultado.insertId;

            // B. Si es pensión o matrícula de la lista, actualizar cargos_estudiante
            if (mes_id) {
                await db.query(
                    `UPDATE cargos_estudiante 
                     SET estado = 'PAGADO', pago_id = ? 
                     WHERE id = ?`,
                    [nuevoPagoId, mes_id]
                );
            }

            await db.query("COMMIT");
            res.json({ success: true, message: "Pago registrado ✅", pagoId: nuevoPagoId });

        } catch (err) {
            await db.query("ROLLBACK");
            console.error("❌ ERROR EN REGISTRAR_PAGO:", err.message);
            res.status(500).json({ error: "No se pudo procesar el cobro" });
        }
    },

    /**
     * 3. Generar Ciclo Escolar Automático (Abril a Febrero)
     * Se llama cuando Gloria inscribe o matricula a un alumno.
     */
    generarCicloEscolar: async (req, res) => {
        const { estudiante_id } = req.body;
        const meses = [
            'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 
            'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'ENERO', 'FEBRERO'
        ];

        try {
            await db.query("START TRANSACTION");

            // A. Cargo de Matrícula ($27.33)
            await db.query(
                "INSERT INTO cargos_estudiante (estudiante_id, mes_nombre, monto_pendiente, estado) VALUES (?, ?, ?, ?)",
                [estudiante_id, 'MATRÍCULA', 27.33, 'PENDIENTE']
            );

            // B. Cargos de Pensión ($40.00)
            for (let mes of meses) {
                await db.query(
                    "INSERT INTO cargos_estudiante (estudiante_id, mes_nombre, monto_pendiente, estado) VALUES (?, ?, ?, ?)",
                    [estudiante_id, mes, 40.00, 'PENDIENTE']
                );
            }

            await db.query("COMMIT");
            res.json({ success: true, message: "Ciclo Abril-Febrero generado ✅" });
        } catch (err) {
            await db.query("ROLLBACK");
            res.status(500).json({ error: "Error al generar pensiones" });
        }
    },

    /**
     * 4. Agregar Mes/Concepto Extra (Flexibilidad para Gloria)
     */
    agregarExtra: async (req, res) => {
        const { estudiante_id, nombre_concepto, monto } = req.body;
        try {
            await db.query(
                "INSERT INTO cargos_estudiante (estudiante_id, mes_nombre, monto_pendiente, estado) VALUES (?, ?, ?, ?)",
                [estudiante_id, nombre_concepto.toUpperCase(), monto, 'PENDIENTE']
            );
            res.json({ success: true, message: "Concepto extra agregado ✅" });
        } catch (err) {
            res.status(500).json({ error: "Error al agregar concepto" });
        }
    }
};

module.exports = pagosController;