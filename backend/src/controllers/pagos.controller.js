/* ========================================================
    CONTROLADOR DE PAGOS - COLEGIO MFC
    Manejo de deudas, semáforo y transacciones de cobro
   ======================================================== */
const db = require("../db");

const pagosController = {
    /**
     * 1. Obtener deudas (El Semáforo)
     * Diseñado para evitar el Error 500 si no hay datos o faltan columnas.
     */
    getDeudas: async (req, res) => {
        const { id } = req.params;
        try {
            // Usamos COALESCE para enviar valores por defecto si la DB tiene nulos
            // Así el Frontend nunca recibe basura y el semáforo carga bien.
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
            
            // Enviamos los datos. Si está vacío, enviamos [] (status 200 siempre).
            res.json(rows || []);

        } catch (err) {
            console.error("❌ ERROR EN GET_DEUDAS:", err.message);
            // Si la tabla no existe o hay error, enviamos vacío para que el frontend no colapse
            res.json([]); 
        }
    },

    /**
     * 2. Registrar un Pago
     * Procesa Inscripción, Matrícula o Pensiones usando Transacciones SQL.
     */
    registrarPago: async (req, res) => {
        const { estudiante_id, concepto, monto, mes_id, metodo_pago } = req.body;
        
        // Validación de seguridad para no guardar datos vacíos
        if (!estudiante_id || !concepto || !monto) {
            return res.status(400).json({ error: "Faltan datos obligatorios (ID, Concepto o Monto)" });
        }

        try {
            // Iniciamos TRANSACCIÓN: Si el UPDATE falla, el PAGO no se guarda.
            await db.query("START TRANSACTION");

            // A. Insertamos el registro en la tabla histórica de pagos
            const [resultado] = await db.query(
                `INSERT INTO pagos (estudiante_id, concepto, monto, metodo_pago, fecha_pago) 
                 VALUES (?, ?, ?, ?, NOW())`,
                [estudiante_id, concepto, monto, metodo_pago || 'EFECTIVO']
            );

            const nuevoPagoId = resultado.insertId;

            // B. Si el pago es una 'pension' y tenemos el ID del mes, actualizamos el cargo
            if (concepto === 'pension' && mes_id) {
                await db.query(
                    `UPDATE cargos_estudiante 
                     SET estado = 'PAGADO', pago_id = ? 
                     WHERE id = ?`,
                    [nuevoPagoId, mes_id]
                );
            }

            // Si todo salió bien, guardamos los cambios permanentemente
            await db.query("COMMIT");

            res.json({ 
                success: true, 
                message: "Pago procesado y registrado correctamente ✅",
                pagoId: nuevoPagoId 
            });

        } catch (err) {
            // Si algo falló, deshacemos todo para no ensuciar la base de datos
            await db.query("ROLLBACK");
            console.error("❌ ERROR EN REGISTRAR_PAGO:", err.message);
            res.status(500).json({ error: "No se pudo completar la operación de cobro" });
        }
    }
};

module.exports = pagosController;