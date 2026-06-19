const express = require("express");
const pool = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();

async function obtenerPeriodoActivoId() {
  const [rows] = await pool.query(
    "SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1"
  );
  return rows[0]?.id || null;
}

async function obtenerColumnasTabla(nombreTabla) {
  const permitidas = new Set(["matriculas", "especialidades"]);
  if (!permitidas.has(nombreTabla)) throw new Error("Tabla no permitida");
  const [cols] = await pool.query(`SHOW COLUMNS FROM ${nombreTabla}`);
  return new Set(cols.map(col => col.Field));
}

async function tablaExiste(nombreTabla) {
  try {
    await obtenerColumnasTabla(nombreTabla);
    return true;
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return false;
    throw err;
  }
}

async function matriculasTieneEspecialidad() {
  try {
    const cols = await obtenerColumnasTabla("matriculas");
    return cols.has("especialidad_id");
  } catch (err) {
    if (err.code === "ER_NO_SUCH_TABLE") return false;
    throw err;
  }
}

async function validarEspecialidadActiva(especialidadId, cursoId) {
  if (!especialidadId) return true;
  const existe = await tablaExiste("especialidades");
  if (!existe) return false;

  const cols = await obtenerColumnasTabla("especialidades");
  let sql = "SELECT id FROM especialidades WHERE id = ?";
  const params = [especialidadId];
  if (cols.has("curso_id")) {
    sql += " AND curso_id = ?";
    params.push(cursoId);
  }
  if (cols.has("estado")) sql += " AND estado = 'ACTIVO'";
  sql += " LIMIT 1";

  const [rows] = await pool.query(sql, params);
  return rows.length > 0;
}

async function listarEspecialidadesCurso(cursoId) {
  const existe = await tablaExiste("especialidades");
  if (!existe) return [];

  const cols = await obtenerColumnasTabla("especialidades");
  const selectCodigo = cols.has("codigo") ? "codigo" : "NULL AS codigo";
  const selectCurso = cols.has("curso_id") ? "curso_id" : "NULL AS curso_id";
  const selectEstado = cols.has("estado") ? "estado" : "'ACTIVO' AS estado";
  let sql = `SELECT id, ${selectCodigo}, nombre, ${selectCurso}, ${selectEstado} FROM especialidades WHERE 1=1`;
  const params = [];

  if (cursoId && cols.has("curso_id")) {
    sql += " AND curso_id = ?";
    params.push(cursoId);
  }
  if (cols.has("estado")) sql += " AND estado = 'ACTIVO'";
  sql += " ORDER BY nombre ASC";

  const [rows] = await pool.query(sql, params);
  return rows || [];
}

router.get("/especialidades", authRequired, async (req, res) => {
  try {
    const rows = await listarEspecialidadesCurso(req.query.curso_id);
    return res.json(rows);
  } catch (err) {
    console.error("Error listando especialidades:", err);
    return res.status(500).json({ error: "Error listando especialidades" });
  }
});

/**
 * POST /enrollments
 * (ADMIN) Matricular estudiante + Generación Automática de Cargos (Deudas)
 */
router.post("/", authRequired, onlyAdmin, async (req, res) => {
  const connection = await pool.getConnection(); // Usamos conexión individual para la transacción
  
  try {
    const { estudiante_id, periodo_id, curso_id, paralelo_id, especialidad_id, fecha_matricula } = req.body;
    const fechaRegistro = fecha_matricula || new Date().toISOString().slice(0, 10);

    if (!estudiante_id || !periodo_id || !curso_id || !paralelo_id) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // Iniciar Transacción: O se hace todo, o no se hace nada
    await connection.beginTransaction();

    // 1. Verificar si ya existe la matrícula
    const [exist] = await connection.query(
      "SELECT id FROM matriculas WHERE estudiante_id=? AND periodo_id=? LIMIT 1",
      [estudiante_id, periodo_id]
    );
    
    if (exist.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Este estudiante ya está matriculado en este periodo" });
    }

    // 2. Insertar la Matrícula 
    const tieneEspecialidad = await matriculasTieneEspecialidad();
    if (tieneEspecialidad && especialidad_id) {
      const okEspecialidad = await validarEspecialidadActiva(especialidad_id, curso_id);
      if (!okEspecialidad) {
        await connection.rollback();
        return res.status(400).json({ error: "La especialidad no esta activa para este curso" });
      }
    }

    const columnasMatricula = ["estudiante_id", "periodo_id", "curso_id", "paralelo_id", "fecha_registro", "estado"];
    const valoresMatricula = [estudiante_id, periodo_id, curso_id, paralelo_id, fechaRegistro, "MATRICULADO"];
    if (tieneEspecialidad) {
      columnasMatricula.splice(4, 0, "especialidad_id");
      valoresMatricula.splice(4, 0, especialidad_id || null);
    }
    const placeholdersMatricula = columnasMatricula.map(() => "?").join(", ");
    const [resultMat] = await connection.query(
      `INSERT INTO matriculas (${columnasMatricula.join(", ")}) VALUES (${placeholdersMatricula})`,
      valoresMatricula
    );
    const matriculaId = resultMat.insertId;

    // 3. Generar Cargo de INSCRIPCIÓN ($25.00) [cite: 10, 60]
    await connection.query(
      `INSERT INTO cargos_estudiante 
       (matricula_id, periodo_id, concepto_id, fecha_emision, valor_total, estado) 
       VALUES (?, ?, (SELECT id FROM conceptos_cobro WHERE codigo='INSCRIPCION'), ?, 25.00, 'PENDIENTE')`,
      [matriculaId, periodo_id, fechaRegistro]
    );

    // 4. Generar 10 Cargos de PENSIÓN ($50.00 c/u) [cite: 9, 61]
    // Meses escolares en Ecuador: Mayo (5) a Febrero (2 del año siguiente)
    const mesesPension = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2];
    
    for (const mesId of mesesPension) {
      await connection.query(
        `INSERT INTO cargos_estudiante 
         (matricula_id, periodo_id, concepto_id, mes_id, fecha_emision, valor_total, estado) 
         VALUES (?, ?, (SELECT id FROM conceptos_cobro WHERE codigo='PENSION'), ?, ?, 50.00, 'PENDIENTE')`,
        [matriculaId, periodo_id, mesId, fechaRegistro]
      );
    }

    // Si llegamos aquí sin errores, confirmamos todo en la BD
    await connection.commit();
    return res.status(201).json({ 
      message: "Matrícula exitosa y deudas generadas (Inscripción + 10 Pensiones) ✅", 
      id: matriculaId 
    });

  } catch (err) {
    // Si algo falla, deshacemos cualquier cambio para no dejar datos huérfanos
    await connection.rollback();
    console.error("Error en Transacción de Matrícula:", err);
    return res.status(500).json({ error: "Error procesando la matrícula y cargos" });
  } finally {
    connection.release(); // Liberar la conexión al pool
  }
});

/**
 * POST /enrollments/asignar-manual
 * (ADMIN) Ubica manualmente un estudiante en curso/paralelo para el periodo activo.
 * Si ya tiene matricula en el periodo, la mueve al nuevo paralelo.
 */
router.post("/asignar-manual", authRequired, onlyAdmin, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      estudiante_id,
      periodo_id,
      curso_id,
      paralelo_id,
      especialidad_id,
      fecha_matricula,
    } = req.body;

    const periodoFinal = periodo_id || await obtenerPeriodoActivoId();
    const fechaFinal = fecha_matricula || new Date().toISOString().slice(0, 10);

    if (!estudiante_id || !periodoFinal || !curso_id || !paralelo_id) {
      return res.status(400).json({ error: "Faltan estudiante, periodo, curso o paralelo" });
    }

    await connection.beginTransaction();

    const [[estudiante], [curso], [paralelo]] = await Promise.all([
      connection.query("SELECT id FROM estudiantes WHERE id = ? LIMIT 1", [estudiante_id]),
      connection.query("SELECT id FROM cursos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1", [curso_id]),
      connection.query("SELECT id FROM paralelos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1", [paralelo_id]),
    ]);

    if (!estudiante.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    if (!curso.length) {
      await connection.rollback();
      return res.status(400).json({ error: "El curso no esta activo" });
    }
    if (!paralelo.length) {
      await connection.rollback();
      return res.status(400).json({ error: "El paralelo no esta activo" });
    }

    const tieneEspecialidad = await matriculasTieneEspecialidad();
    if (tieneEspecialidad && especialidad_id) {
      const okEspecialidad = await validarEspecialidadActiva(especialidad_id, curso_id);
      if (!okEspecialidad) {
        await connection.rollback();
        return res.status(400).json({ error: "La especialidad no esta activa para este curso" });
      }
    }

    const [exist] = await connection.query(
      "SELECT id FROM matriculas WHERE estudiante_id = ? AND periodo_id = ? LIMIT 1",
      [estudiante_id, periodoFinal]
    );

    let matriculaId;
    if (exist.length) {
      matriculaId = exist[0].id;
      await connection.query(
        `UPDATE matriculas
         SET curso_id = ?, paralelo_id = ?${tieneEspecialidad ? ", especialidad_id = ?" : ""}, estado = 'MATRICULADO'
         WHERE id = ?`,
        tieneEspecialidad
          ? [curso_id, paralelo_id, especialidad_id || null, matriculaId]
          : [curso_id, paralelo_id, matriculaId]
      );
    } else {
      const columnasMatricula = ["estudiante_id", "periodo_id", "curso_id", "paralelo_id", "fecha_registro", "estado"];
      const valoresMatricula = [estudiante_id, periodoFinal, curso_id, paralelo_id, fechaFinal, "MATRICULADO"];
      if (tieneEspecialidad) {
        columnasMatricula.splice(4, 0, "especialidad_id");
        valoresMatricula.splice(4, 0, especialidad_id || null);
      }
      const placeholdersMatricula = columnasMatricula.map(() => "?").join(", ");
      const [result] = await connection.query(
        `INSERT INTO matriculas (${columnasMatricula.join(", ")}) VALUES (${placeholdersMatricula})`,
        valoresMatricula
      );
      matriculaId = result.insertId;
    }

    await connection.query(
      "UPDATE estudiantes SET curso_id = ?, estado = 'ACTIVO', fecha_matricula = COALESCE(fecha_matricula, NOW()) WHERE id = ?",
      [curso_id, estudiante_id]
    );

    await connection.commit();
    return res.json({
      success: true,
      id: matriculaId,
      message: "Estudiante asignado al curso y paralelo",
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error en asignacion manual:", err);
    return res.status(500).json({ error: "Error al asignar estudiante al paralelo" });
  } finally {
    connection.release();
  }
});

/**
 * POST /enrollments/distribuir
 * (ADMIN) Mueve en bloque matriculas existentes a otro paralelo del mismo curso.
 */
router.post("/distribuir", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { matricula_ids, curso_id, paralelo_id, periodo_id, especialidad_id } = req.body;
    const periodoFinal = periodo_id || await obtenerPeriodoActivoId();

    if (!Array.isArray(matricula_ids) || !matricula_ids.length || !curso_id || !paralelo_id || !periodoFinal) {
      return res.status(400).json({ error: "Seleccione estudiantes y paralelo destino" });
    }

    const ids = [...new Set(matricula_ids.map(Number).filter(Number.isFinite))];
    if (!ids.length) return res.status(400).json({ error: "Lista de matriculas invalida" });

    const [[curso], [paralelo]] = await Promise.all([
      pool.query("SELECT id FROM cursos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1", [curso_id]),
      pool.query("SELECT id FROM paralelos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1", [paralelo_id]),
    ]);

    if (!curso.length) return res.status(400).json({ error: "El curso no esta activo" });
    if (!paralelo.length) return res.status(400).json({ error: "El paralelo no esta activo" });

    const tieneEspecialidad = await matriculasTieneEspecialidad();
    const especialidadNormalizada = (especialidad_id === "" || especialidad_id === undefined) ? null : especialidad_id;
    const debeActualizarEspecialidad = tieneEspecialidad && especialidadNormalizada !== null;
    if (debeActualizarEspecialidad) {
      const okEspecialidad = await validarEspecialidadActiva(especialidadNormalizada, curso_id);
      if (!okEspecialidad) return res.status(400).json({ error: "La especialidad no esta activa para este curso" });
    }

    const placeholders = ids.map(() => "?").join(",");
    const [elegibles] = await pool.query(
      `SELECT id
       FROM matriculas
       WHERE id IN (${placeholders})
         AND curso_id = ?
         AND periodo_id = ?
         AND estado IN ('ACTIVO','MATRICULADO')`,
      [...ids, curso_id, periodoFinal]
    );

    const elegiblesIds = elegibles.map(row => Number(row.id));
    if (!elegiblesIds.length) {
      return res.status(400).json({
        error: "Ninguna matricula coincide con el curso/periodo indicado o esta inactiva",
        moved: 0,
        requested: ids.length,
      });
    }

    const placeholdersElegibles = elegiblesIds.map(() => "?").join(",");
    const [result] = await pool.query(
      `UPDATE matriculas
       SET paralelo_id = ?${debeActualizarEspecialidad ? ", especialidad_id = ?" : ""}, estado = 'ACTIVO'
       WHERE id IN (${placeholdersElegibles})`,
      debeActualizarEspecialidad
        ? [paralelo_id, especialidadNormalizada, ...elegiblesIds]
        : [paralelo_id, ...elegiblesIds]
    );

    return res.json({
      success: true,
      message: "Distribucion actualizada",
      moved: result.affectedRows,
      requested: ids.length,
      skipped: ids.length - result.affectedRows,
      moved_ids: elegiblesIds,
    });
  } catch (err) {
    console.error("Error al distribuir matriculas:", err);
    return res.status(500).json({ error: "Error al distribuir estudiantes" });
  }
});

/**
 * GET /enrollments - Listar matrículas con filtros
 */
router.get("/", authRequired, async (req, res) => {
  try {
    const { periodo_id, curso_id, paralelo_id, especialidad_id, estado } = req.query;
    const tieneEspecialidad = await matriculasTieneEspecialidad();
    const existeEspecialidades = tieneEspecialidad ? await tablaExiste("especialidades") : false;
    const selectEspecialidad = tieneEspecialidad
      ? ", m.especialidad_id, esp.nombre AS especialidad"
      : ", NULL AS especialidad_id, NULL AS especialidad";
    const joinEspecialidad = existeEspecialidades
      ? "LEFT JOIN especialidades esp ON esp.id = m.especialidad_id"
      : "";
    let sql = `
      SELECT m.id, m.estudiante_id, m.periodo_id, m.curso_id, m.paralelo_id,
             CONCAT(e.apellidos_est, ' ', e.nombres_est) AS estudiante,
             e.cedula_est AS cedula,
             p.nombre AS periodo, c.nombre AS curso, pr.nombre AS paralelo, 
             m.fecha_registro AS fecha_matricula, m.estado
             ${selectEspecialidad}
      FROM matriculas m
      JOIN estudiantes e ON e.id = m.estudiante_id
      JOIN periodos_lectivos p ON p.id = m.periodo_id
      JOIN cursos c ON c.id = m.curso_id
      JOIN paralelos pr ON pr.id = m.paralelo_id
      ${joinEspecialidad}
      WHERE 1=1
    `;
    const params = [];
    if (periodo_id) { sql += " AND m.periodo_id=?"; params.push(periodo_id); }
    if (curso_id) { sql += " AND m.curso_id=?"; params.push(curso_id); }
    if (paralelo_id) { sql += " AND m.paralelo_id=?"; params.push(paralelo_id); }
    if (especialidad_id && tieneEspecialidad) { sql += " AND m.especialidad_id=?"; params.push(especialidad_id); }
    if (estado) { sql += " AND m.estado=?"; params.push(estado); }

    sql += " ORDER BY e.apellidos_est ASC";
    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Error listando matrículas" });
  }
});

/**
 * PUT /enrollments/:id/estado - Actualizar estado
 */
router.put("/:id/estado", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const allowed = ["MATRICULADO", "RETIRADO", "TRANSFERIDO", "GRADUADO"];
    if (!allowed.includes(estado)) return res.status(400).json({ error: "Estado inválido" });

    await pool.query("UPDATE matriculas SET estado=? WHERE id=?", [estado, id]);
    return res.json({ message: "Estado actualizado ✅" });
  } catch (err) {
    return res.status(500).json({ error: "Error actualizando estado" });
  }
});

module.exports = router;
