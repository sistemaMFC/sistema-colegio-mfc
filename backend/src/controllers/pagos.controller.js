const db = require("../db");

const MESES_CICLO = [
    "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE",
    "OCTUBRE", "NOVIEMBRE", "DICIEMBRE", "ENERO", "FEBRERO"
];

function toPositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function getCargoLegacy(conn, estudianteId, cargoId) {
    const [rows] = await conn.query(
        `SELECT
            id,
            estudiante_id,
            COALESCE(mes_nombre, 'PENSION') AS mes_nombre,
            COALESCE(monto_pendiente, 0) AS monto_pendiente,
            COALESCE(estado, 'PENDIENTE') AS estado,
            COALESCE(tipo_cargo, 'OTROS') AS tipo_cargo
         FROM cargos_estudiante
         WHERE id = ? AND estudiante_id = ?
         FOR UPDATE`,
        [cargoId, estudianteId]
    );
    return rows[0] || null;
}

async function getCargoMatricula(conn, estudianteId, cargoId) {
    const [rows] = await conn.query(
        `SELECT
            ce.id,
            m.estudiante_id,
            COALESCE(cc.nombre, cc.codigo, CONCAT('CARGO ', ce.id)) AS mes_nombre,
            ce.valor_total AS monto_pendiente,
            ce.estado,
            COALESCE(cc.codigo, 'OTROS') AS tipo_cargo
         FROM cargos_estudiante ce
         JOIN matriculas m ON m.id = ce.matricula_id
         LEFT JOIN conceptos_cobro cc ON cc.id = ce.concepto_id
         WHERE ce.id = ? AND m.estudiante_id = ?
         FOR UPDATE`,
        [cargoId, estudianteId]
    );
    return rows[0] || null;
}

async function getCargo(conn, estudianteId, cargoId) {
    try {
        return await getCargoLegacy(conn, estudianteId, cargoId);
    } catch (err) {
        if (err.code !== "ER_BAD_FIELD_ERROR") throw err;
        return getCargoMatricula(conn, estudianteId, cargoId);
    }
}

async function updateCargoPagado(conn, cargoId, estudianteId, pagoId) {
    try {
        const [result] = await conn.query(
            `UPDATE cargos_estudiante
             SET estado = 'PAGADO', pago_id = ?
             WHERE id = ? AND estudiante_id = ? AND estado = 'PENDIENTE'`,
            [pagoId, cargoId, estudianteId]
        );
        return result.affectedRows;
    } catch (err) {
        if (err.code !== "ER_BAD_FIELD_ERROR") throw err;
        const [result] = await conn.query(
            `UPDATE cargos_estudiante
             SET estado = 'PAGADO'
             WHERE id = ? AND estado = 'PENDIENTE'`,
            [cargoId]
        );
        return result.affectedRows;
    }
}

const pagosController = {
    getDeudas: async (req, res) => {
        const estudianteId = Number(req.params.id);
        if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
            return res.status(400).json({ error: "ID de estudiante invalido" });
        }

        try {
            const [rows] = await db.query(
                `SELECT
                    id,
                    estudiante_id,
                    COALESCE(mes_nombre, 'PENSION') AS mes_nombre,
                    COALESCE(monto_pendiente, 0) AS monto_pendiente,
                    COALESCE(estado, 'PENDIENTE') AS estado,
                    COALESCE(tipo_cargo, 'OTROS') AS tipo_cargo
                 FROM cargos_estudiante
                 WHERE estudiante_id = ?
                 ORDER BY (CASE WHEN tipo_cargo = 'MATRICULA' THEN 0 ELSE 1 END), id ASC`,
                [estudianteId]
            );
            return res.json(rows || []);
        } catch (err) {
            if (err.code !== "ER_BAD_FIELD_ERROR") {
                console.error("ERROR EN GET_DEUDAS:", err.message);
                return res.status(500).json({ error: "Error al consultar deudas" });
            }

            try {
                const [rows] = await db.query(
                    `SELECT
                        ce.id,
                        m.estudiante_id,
                        COALESCE(cc.nombre, cc.codigo, CONCAT('CARGO ', ce.id)) AS mes_nombre,
                        ce.valor_total AS monto_pendiente,
                        ce.estado,
                        COALESCE(cc.codigo, 'OTROS') AS tipo_cargo
                     FROM cargos_estudiante ce
                     JOIN matriculas m ON m.id = ce.matricula_id
                     LEFT JOIN conceptos_cobro cc ON cc.id = ce.concepto_id
                     WHERE m.estudiante_id = ?
                     ORDER BY ce.id ASC`,
                    [estudianteId]
                );
                return res.json(rows || []);
            } catch (fallbackErr) {
                console.error("ERROR EN GET_DEUDAS FALLBACK:", fallbackErr.message);
                return res.status(500).json({ error: "Error al consultar deudas" });
            }
        }
    },

    registrarPago: async (req, res) => {
        const estudianteId = Number(req.body.estudiante_id);
        const cargoId = req.body.mes_id ? Number(req.body.mes_id) : null;
        const metodoPago = req.body.metodo_pago || "EFECTIVO";

        if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
            return res.status(400).json({ error: "Estudiante invalido" });
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            let concepto = String(req.body.concepto || "").trim().toUpperCase();
            let monto = toPositiveNumber(req.body.monto);

            if (cargoId) {
                const cargo = await getCargo(conn, estudianteId, cargoId);
                if (!cargo) {
                    await conn.rollback();
                    return res.status(404).json({ error: "Cargo no encontrado para este estudiante" });
                }

                if (cargo.estado !== "PENDIENTE") {
                    await conn.rollback();
                    return res.status(409).json({ error: "Este cargo ya fue procesado" });
                }

                concepto = String(cargo.mes_nombre || cargo.tipo_cargo || "CARGO").toUpperCase();
                monto = toPositiveNumber(cargo.monto_pendiente);
            }

            if (!concepto || !monto) {
                await conn.rollback();
                return res.status(400).json({ error: "Concepto y monto validos son obligatorios" });
            }

            const [resultado] = await conn.query(
                `INSERT INTO pagos (estudiante_id, concepto, monto, metodo_pago, fecha_pago)
                 VALUES (?, ?, ?, ?, NOW())`,
                [estudianteId, concepto, monto, metodoPago]
            );

            if (cargoId) {
                const updated = await updateCargoPagado(conn, cargoId, estudianteId, resultado.insertId);
                if (!updated) {
                    await conn.rollback();
                    return res.status(409).json({ error: "No se pudo actualizar el cargo" });
                }
            }

            await conn.commit();
            return res.json({
                success: true,
                message: "Pago procesado correctamente",
                pago_id: resultado.insertId,
                concepto,
                monto
            });
        } catch (err) {
            await conn.rollback();
            console.error("ERROR EN REGISTRAR_PAGO:", err.message);
            return res.status(500).json({ error: "Error en el servidor al procesar cobro" });
        } finally {
            conn.release();
        }
    },

    generarCicloEscolar: async (req, res) => {
        const estudianteId = Number(req.body.estudiante_id);
        if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
            return res.status(400).json({ error: "Estudiante invalido" });
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            const [existentes] = await conn.query(
                `SELECT COUNT(*) AS total
                 FROM cargos_estudiante
                 WHERE estudiante_id = ?
                   AND tipo_cargo IN ('MATRICULA', 'PENSION')
                   AND estado <> 'ANULADO'`,
                [estudianteId]
            );

            if (Number(existentes[0]?.total || 0) > 0) {
                await conn.rollback();
                return res.status(409).json({ error: "El ciclo ya fue generado para este estudiante" });
            }

            await conn.query(
                `INSERT INTO cargos_estudiante
                 (estudiante_id, mes_nombre, monto_pendiente, estado, tipo_cargo)
                 VALUES (?, ?, ?, 'PENDIENTE', 'MATRICULA')`,
                [estudianteId, "MATRICULA", 27.33]
            );

            for (const mes of MESES_CICLO) {
                await conn.query(
                    `INSERT INTO cargos_estudiante
                     (estudiante_id, mes_nombre, monto_pendiente, estado, tipo_cargo)
                     VALUES (?, ?, ?, 'PENDIENTE', 'PENSION')`,
                    [estudianteId, mes, 40.00]
                );
            }

            await conn.commit();
            return res.json({ success: true, message: "Ciclo generado correctamente" });
        } catch (err) {
            await conn.rollback();
            console.error("ERROR GENERAR_CICLO:", err.message);
            return res.status(500).json({ error: "No se pudo generar el anio lectivo" });
        } finally {
            conn.release();
        }
    },

    agregarExtra: async (req, res) => {
        const estudianteId = Number(req.body.estudiante_id);
        const concepto = String(req.body.nombre_concepto || "").trim().toUpperCase();
        const monto = toPositiveNumber(req.body.monto);

        if (!Number.isInteger(estudianteId) || estudianteId <= 0 || !concepto || !monto) {
            return res.status(400).json({ error: "Datos de cargo extra invalidos" });
        }

        try {
            await db.query(
                `INSERT INTO cargos_estudiante
                 (estudiante_id, mes_nombre, monto_pendiente, estado, tipo_cargo)
                 VALUES (?, ?, ?, 'PENDIENTE', 'OTROS')`,
                [estudianteId, concepto, monto]
            );
            return res.json({ success: true, message: "Cargo extra registrado" });
        } catch (err) {
            console.error("ERROR AGREGAR_EXTRA:", err.message);
            return res.status(500).json({ error: "Error al agregar el concepto extra" });
        }
    }
};

module.exports = pagosController;
