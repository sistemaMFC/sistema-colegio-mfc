const db = require("../db");

const pagosController = {
    // 1. Obtener deudas (El Semáforo)
    getDeudas: async (req, res) => {
        const { id } = req.params;
        try {
            // Verificamos si existen cargos para este estudiante
            const [rows] = await db.query(
                "SELECT * FROM cargos_estudiante WHERE estudiante_id = ? ORDER BY id ASC",
                [id]
            );
            
            // Si no hay deudas, devolvemos un array vacío pero con status 200 (OK)
            res.json(rows || []);
        } catch (err) {
            console.error("❌ Error en getDeudas:", err.message);
            res.status(500).json({ error: "Error al consultar la tabla de cargos" });
        }
    },

    // 2. Registrar un Pago (Inscripción, Matrícula o Pensión)
    registrarPago: async (req, res) => {
        const { estudiante_id, concepto, monto, mes_id, metodo_pago } = req.body;
        
        // Validación de datos mínimos
        if (!estudiante_id || !concepto || !monto) {
            return res.status(400).json({ error: "Faltan datos obligatorios para el pago" });
        }

        try {
            await db.query("START TRANSACTION");

            // A. Insertar en la tabla de PAGOS
            // Nota: Asegúrate que tu tabla 'pagos' tenga estas columnas exactas
            const [resultado] = await db.query(
                "INSERT INTO pagos (estudiante_id, concepto, monto, metodo_pago, fecha_pago) VALUES (?, ?, ?, ?, NOW())",
                [estudiante_id, concepto, monto, metodo_pago || 'EFECTIVO']
            );

            const nuevoPagoId = resultado.insertId;

            // B. Si es pensión, actualizar el cargo correspondiente
            if (concepto === 'pension' && mes_id) {
                await db.query(
                    "UPDATE cargos_estudiante SET estado = 'PAGADO', pago_id = ? WHERE id = ?",
                    [nuevoPagoId, mes_id]
                );
            }

            await db.query("COMMIT");
            res.json({ 
                success: true, 
                message: "Pago registrado correctamente ✅",
                pagoId: nuevoPagoId 
            });

        } catch (err) {
            await db.query("ROLLBACK");
            console.error("❌ Error en registrarPago:", err.message);
            res.status(500).json({ error: "No se pudo completar la transacción de pago" });
        }
    }
};

module.exports = pagosController;