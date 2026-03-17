const db = require("../config/db");

const pagosController = {
    // 1. Obtener deudas (El Semáforo)
    getDeudas: async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await db.query(
                "SELECT * FROM cargos_estudiante WHERE estudiante_id = ? ORDER BY fecha_vencimiento ASC",
                [id]
            );
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: "Error al consultar deudas" });
        }
    },

    // 2. Registrar un Pago (Inscripción, Matrícula o Pensión)
    registrarPago: async (req, res) => {
        const { estudiante_id, concepto, monto, mes_id, metodo_pago } = req.body;
        try {
            // Iniciamos transacción para que si algo falla, no se guarde nada a medias
            await db.query("START TRANSACTION");

            // A. Insertar en la tabla de PAGOS
            const [pago] = await db.query(
                "INSERT INTO pagos (estudiante_id, concepto, monto, metodo_pago, fecha_pago) VALUES (?, ?, ?, ?, NOW())",
                [estudiante_id, concepto, monto, metodo_pago]
            );

            // B. Si es pensión, actualizar la tabla de CARGOS
            if (concepto === 'pension' && mes_id) {
                await db.query(
                    "UPDATE cargos_estudiante SET estado = 'PAGADO', pago_id = ? WHERE id = ?",
                    [pago.insertId, mes_id]
                );
            }

            await db.query("COMMIT");
            res.json({ success: true, message: "Pago registrado correctamente ✅" });
        } catch (err) {
            await db.query("ROLLBACK");
            res.status(500).json({ error: "Error al procesar el pago" });
        }
    }
};

module.exports = pagosController;