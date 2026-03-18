/* ========================================================
    CONTROLADOR DE PAGOS - COLEGIO MFC
    Lógica de Separación: Matrícula vs Pensiones
   ======================================================== */
const db = require("../db");

const pagosController = {
    /**
     * 1. Obtener deudas (El Semáforo)
     * Ordena para que la MATRÍCULA aparezca siempre primero.
     */
    getDeudas: async (req, res) => {
        const { id } = req.params;
        try {
            // Ordenamos por tipo_cargo para que MATRICULA salga antes que PENSION
            const [rows] = await db.query(
                `SELECT 
                    id, 
                    estudiante_id, 
                    COALESCE(mes_nombre, 'Pensión') as mes_nombre, 
                    COALESCE(monto_pendiente, 40.00) as monto_pendiente, 
                    COALESCE(estado, 'PENDIENTE') as estado,
                    tipo_cargo
                 FROM cargos_estudiante 
                 WHERE estudiante_id = ? 
                 ORDER BY (CASE WHEN tipo_cargo = 'MATRICULA' THEN 0 ELSE 1 END), id ASC`,
                [id]
            );
            res.json(rows || []);
        } catch (err) {
            console.error("❌ ERROR EN GET_DEUDAS:", err.message);
            res.json([]); 
        }
    },

    /**
     * 2. Registrar un Pago
     */
    registrarPago: async (req, res) => {
        const { estudiante_id, concepto, monto, mes_id, metodo_pago } = req.body;
        
        if (!estudiante_id || !concepto || !monto) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        try {
            await db.query("START TRANSACTION");

            // Insertamos el registro del pago histórico
            const [resultado] = await db.query(
                `INSERT INTO pagos (estudiante_id, concepto, monto, metodo_pago, fecha_pago) 
                 VALUES (?, ?, ?, ?, NOW())`,
                [estudiante_id, concepto, monto, metodo_pago || 'EFECTIVO']
            );

            const nuevoPagoId = resultado.insertId;

            // Si el pago está vinculado a un cargo (Matrícula o Mes específico)
            if (mes_id) {
                await db.query(
                    `UPDATE cargos_estudiante 
                     SET estado = 'PAGADO', pago_id = ? 
                     WHERE id = ?`,
                    [nuevoPagoId, mes_id]
                );
            }

            await db.query("COMMIT");
            res.json({ success: true, message: "Pago procesado correctamente ✅" });

        } catch (err) {
            await db.query("ROLLBACK");
            console.error("❌ ERROR EN REGISTRAR_PAGO:", err.message);
            res.status(500).json({ error: "Error en el servidor al procesar cobro" });
        }
    },

    /**
     * 3. Generar Ciclo Escolar Automático (Separado)
     * Crea Matrícula ($27.33) y Pensiones ($40.00) con etiquetas distintas.
     */
    generarCicloEscolar: async (req, res) => {
        const { estudiante_id } = req.body;
        const meses = [
            'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 
            'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'ENERO', 'FEBRERO'
        ];

        try {
            await db.query("START TRANSACTION");

            // A. Insertar MATRÍCULA como un cargo único y separado
            await db.query(
                "INSERT INTO cargos_estudiante (estudiante_id, mes_nombre, monto_pendiente, estado, tipo_cargo) VALUES (?, ?, ?, ?, ?)",
                [estudiante_id, 'MATRÍCULA', 27.33, 'PENDIENTE', 'MATRICULA']
            );

            // B. Insertar PENSIONES mensuales
            for (let mes of meses) {
                await db.query(
                    "INSERT INTO cargos_estudiante (estudiante_id, mes_nombre, monto_pendiente, estado, tipo_cargo) VALUES (?, ?, ?, ?, ?)",
                    [estudiante_id, mes, 40.00, 'PENDIENTE', 'PENSION']
                );
            }

            await db.query("COMMIT");
            res.json({ success: true, message: "Ciclo generado: Matrícula y Pensiones separadas ✅" });
        } catch (err) {
            await db.query("ROLLBACK");
            console.error("❌ ERROR GENERAR_CICLO:", err.message);
            res.status(500).json({ error: "No se pudo generar el año lectivo" });
        }
    },

    /**
     * 4. Agregar Extra (Otros cobros)
     */
    agregarExtra: async (req, res) => {
        const { estudiante_id, nombre_concepto, monto } = req.body;
        try {
            await db.query(
                "INSERT INTO cargos_estudiante (estudiante_id, mes_nombre, monto_pendiente, estado, tipo_cargo) VALUES (?, ?, ?, ?, ?)",
                [estudiante_id, nombre_concepto.toUpperCase(), monto, 'PENDIENTE', 'OTROS']
            );
            res.json({ success: true, message: "Cargo extra registrado ✅" });
        } catch (err) {
            res.status(500).json({ error: "Error al agregar el concepto extra" });
        }
    }
};

module.exports = pagosController;