const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const { authRequired, onlyAdmin } = require("../middlewares/auth");

const router = express.Router();
const ROLES_PERMITIDOS = ["ADMIN", "SECRETARIA", "COLECTOR", "PROFESOR"];
const MATERIAS_OFICIALES = [
  { codigo: "CEL", nombre: "COMPRENSIÓN Y EXPRESIÓN DEL LENGUAJE" },
  { codigo: "RLM", nombre: "RELACIÓN LÓGICO MATEMÁTICO" },
  { codigo: "RLG", nombre: "RELACIONES LÓGICAS MATEMÁTICAS" },
  { codigo: "IAU", nombre: "IDENTIDAD Y AUTONOMÍA" },
  { codigo: "RMN", nombre: "RELACIÓN CON EL MEDIO NATURAL Y CULTURAL" },
  { codigo: "RMC", nombre: "RELACIONES CON EL MEDIO NATURAL Y CULTURAL" },
  { codigo: "ING", nombre: "INGLÉS" },
  { codigo: "CON", nombre: "CONVIVENCIA" },
  { codigo: "ECA", nombre: "EDUCACIÓN CULTURAL Y ARTÍSTICA" },
  { codigo: "EAR", nombre: "EXPRESIÓN ARTÍSTICA" },
  { codigo: "EFI", nombre: "EDUCACIÓN FÍSICA" },
  { codigo: "LEN", nombre: "LENGUA Y LITERATURA" },
  { codigo: "MAT", nombre: "MATEMÁTICAS" },
  { codigo: "CNT", nombre: "CIENCIAS NATURALES" },
  { codigo: "SOC", nombre: "ESTUDIOS SOCIALES" },
  { codigo: "ACO", nombre: "ACOMPAÑAMIENTO" },
  { codigo: "ALE", nombre: "ANIMACIÓN A LA LECTURA" },
  { codigo: "FCR", nombre: "FORMACIÓN CRISTIANA" },
  { codigo: "COM", nombre: "COMPUTACIÓN" },
  { codigo: "CIV", nombre: "CÍVICA" },
  { codigo: "ECO", nombre: "EXPRESIÓN CORPORAL" },
  { codigo: "LEX", nombre: "LENGUA EXTRANJERA" },
  { codigo: "ECF", nombre: "EDUCACIÓN CULTURAL Y FÍSICA" },
  { codigo: "FCV", nombre: "FORMACIÓN CRISTIANA Y VALORES" },
];

function normalizarTextoMayuscula(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizarCodigoMateria(value) {
  return normalizarTextoMayuscula(value).replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

function claveComparacionMateria(value) {
  return normalizarTextoMayuscula(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function generarCodigoMateria(nombre) {
  const base = normalizarTextoMayuscula(nombre)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(" ")
    .filter(word => !["Y", "DE", "DEL", "LA", "EL", "LOS", "LAS", "CON"].includes(word))
    .map(word => word[0])
    .join("");
  return (base || normalizarTextoMayuscula(nombre).replace(/[^A-Z0-9]/g, "")).slice(0, 8);
}

async function guardarMateriaCatalogo({ codigo, nombre }, id = null) {
  const nombreFinal = normalizarTextoMayuscula(nombre);
  const codigoFinal = normalizarCodigoMateria(codigo || generarCodigoMateria(nombreFinal));

  if (!nombreFinal) {
    const error = new Error("El nombre de la materia es obligatorio");
    error.status = 400;
    throw error;
  }

  if (!codigoFinal) {
    const error = new Error("El codigo de la materia es obligatorio");
    error.status = 400;
    throw error;
  }

  const [existentes] = await db.query(`SELECT id, codigo, nombre FROM materias`);
  const dupNombre = existentes.find(row =>
    (!id || Number(row.id) !== Number(id)) &&
    claveComparacionMateria(row.nombre) === claveComparacionMateria(nombreFinal)
  );
  if (dupNombre) {
    const error = new Error("Ya existe una materia con ese nombre");
    error.status = 409;
    throw error;
  }

  const dupCodigo = existentes.find(row =>
    (!id || Number(row.id) !== Number(id)) &&
    normalizarCodigoMateria(row.codigo) === codigoFinal
  );
  if (dupCodigo) {
    const error = new Error("Ya existe una materia con ese codigo");
    error.status = 409;
    throw error;
  }

  const paramsNombre = [nombreFinal];
  const paramsCodigo = [codigoFinal];
  let filtroId = "";
  if (id) {
    filtroId = " AND id <> ?";
    paramsNombre.push(id);
    paramsCodigo.push(id);
  }

  const [porNombre] = await db.query(
    `SELECT id FROM materias WHERE UPPER(TRIM(nombre)) = ?${filtroId} LIMIT 1`,
    paramsNombre
  );
  if (porNombre.length > 0) {
    const error = new Error("Ya existe una materia con ese nombre");
    error.status = 409;
    throw error;
  }

  const [porCodigo] = await db.query(
    `SELECT id FROM materias WHERE UPPER(TRIM(codigo)) = ?${filtroId} LIMIT 1`,
    paramsCodigo
  );
  if (porCodigo.length > 0) {
    const error = new Error("Ya existe una materia con ese codigo");
    error.status = 409;
    throw error;
  }

  return { codigo: codigoFinal, nombre: nombreFinal };
}

async function upsertMateriaOficial(item) {
  const nombreFinal = normalizarTextoMayuscula(item.nombre);
  const codigoFinal = normalizarCodigoMateria(item.codigo);

  const [existentes] = await db.query(`SELECT id, codigo, nombre FROM materias`);
  const porNombre = existentes.filter(row =>
    claveComparacionMateria(row.nombre) === claveComparacionMateria(nombreFinal)
  );
  const porCodigo = existentes.filter(row =>
    normalizarCodigoMateria(row.codigo) === codigoFinal
  );

  if (porNombre.length && porCodigo.length && Number(porNombre[0].id) !== Number(porCodigo[0].id)) {
    return { codigo: codigoFinal, nombre: nombreFinal, status: "conflicto" };
  }

  const existente = porNombre[0] || porCodigo[0];
  if (existente) {
    await db.query(
      `UPDATE materias SET codigo = ?, nombre = ?, estado = 'ACTIVO' WHERE id = ?`,
      [codigoFinal, nombreFinal, existente.id]
    );
    return { id: existente.id, codigo: codigoFinal, nombre: nombreFinal, status: "actualizada" };
  }

  const [result] = await db.query(
    `INSERT INTO materias (codigo, nombre, estado) VALUES (?, ?, 'ACTIVO')`,
    [codigoFinal, nombreFinal]
  );
  return { id: result.insertId, codigo: codigoFinal, nombre: nombreFinal, status: "creada" };
}

async function obtenerPeriodoActivoId() {
  const [rows] = await db.query(
    `SELECT id FROM periodos_lectivos WHERE estado = 'ACTIVO' LIMIT 1`
  );
  return rows[0]?.id || null;
}

async function obtenerColumnasTabla(nombreTabla) {
  const tablasPermitidas = new Set([
    "asignaciones_docente",
    "cursos",
    "paralelos",
    "materias",
    "docentes",
  ]);
  if (!tablasPermitidas.has(nombreTabla)) {
    throw new Error("Tabla no permitida para inspeccion");
  }
  const [cols] = await db.query(`SHOW COLUMNS FROM ${nombreTabla}`);
  return new Set(cols.map(col => col.Field));
}

async function obtenerConfigProfesorAsignacion() {
  const cols = await obtenerColumnasTabla("asignaciones_docente");
  if (cols.has("docente_id")) return { col: "docente_id", tipo: "docente" };
  if (cols.has("profesor_id")) return { col: "profesor_id", tipo: "usuario" };
  if (cols.has("usuario_id")) return { col: "usuario_id", tipo: "usuario" };
  if (cols.has("docente_usuario_id")) return { col: "docente_usuario_id", tipo: "usuario" };
  const error = new Error("La tabla asignaciones_docente no tiene columna de profesor reconocida");
  error.status = 500;
  throw error;
}

async function asegurarDocenteDesdeUsuario(usuarioId) {
  const [usuarios] = await db.query(
    `SELECT id, cedula, rol, estado FROM usuarios WHERE id = ? LIMIT 1`,
    [usuarioId]
  );

  if (!usuarios.length) {
    const error = new Error("Usuario no encontrado");
    error.status = 404;
    throw error;
  }

  const usuario = usuarios[0];
  if (!["PROFESOR", "ADMIN"].includes(usuario.rol)) {
    const error = new Error("Solo usuarios PROFESOR o ADMIN pueden asignarse como docentes");
    error.status = 400;
    throw error;
  }

  const [docentes] = await db.query(
    `SELECT id FROM docentes WHERE usuario_id = ? LIMIT 1`,
    [usuario.id]
  );

  if (docentes.length) {
    await db.query(
      `UPDATE docentes SET cedula = ?, estado = 'ACTIVO' WHERE id = ?`,
      [usuario.cedula, docentes[0].id]
    );
    return docentes[0].id;
  }

  const [result] = await db.query(
    `INSERT INTO docentes (usuario_id, cedula, estado) VALUES (?, ?, 'ACTIVO')`,
    [usuario.id, usuario.cedula]
  );
  return result.insertId;
}

/**
 * 1. GET /api/admin/cursos/estadisticas
 * Obtiene la lista de cursos con el conteo REAL de matriculados para el Dashboard.
 * Se permite a cualquier usuario autenticado ver las estadísticas.
 */
router.get("/cursos/estadisticas", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.id, 
        c.nombre, 
        COUNT(e.id) AS total_matriculados
      FROM cursos c
      LEFT JOIN estudiantes e ON c.id = e.curso_id AND e.estado = 'ACTIVO'
      GROUP BY c.id, c.nombre
      ORDER BY c.orden ASC
    `);

    return res.json(rows);
  } catch (err) {
    console.error("❌ Error cargando estadísticas de cursos:", err);
    return res.status(500).json({ error: "Error al obtener datos de cursos" });
  }
});

/**
 * 2. POST /api/admin/usuarios
 * (SOLO ADMIN) Crea administradores, colectores o secretarias con contraseña encriptada.
 */
router.post("/usuarios", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { nombres, apellidos, cedula, password, rol } = req.body;

    if (!nombres || !apellidos || !cedula || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios (Nombres, Cédula, Password)" });
    }

    const cedulaLimpia = String(cedula).trim();
    if (!/^\d{10}$/.test(cedulaLimpia)) {
      return res.status(400).json({ error: "La cédula debe tener exactamente 10 dígitos" });
    }

    const [exist] = await db.query("SELECT id FROM usuarios WHERE cedula = ? LIMIT 1", [cedulaLimpia]);
    if (exist.length > 0) {
      return res.status(409).json({ error: "Ya existe un usuario registrado con esa cédula" });
    }

    const rolFinal = rol ? rol.toUpperCase() : "SECRETARIA";
    if (!ROLES_PERMITIDOS.includes(rolFinal)) {
      return res.status(400).json({ error: "Rol invalido" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO usuarios (nombres, apellidos, cedula, password_hash, rol, estado)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO')`,
      [nombres, apellidos, cedulaLimpia, hashedPassword, rolFinal]
    );

    return res.status(201).json({
      success: true,
      message: "Usuario creado correctamente ✅",
      user: { id: result.insertId, nombres, apellidos, cedula: cedulaLimpia, rol: rolFinal }
    });

  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
    return res.status(500).json({ error: "Error interno al procesar el registro" });
  }
});

/**
 * 3. GET /api/admin/usuarios
 * Listado global de personal.
 * ACTUALIZACIÓN: Se eliminó el campo 'created_at' de la consulta SQL para evitar el error de columna desconocida.
 */
router.get("/usuarios", authRequired, async (req, res) => {
  try {
    // Se quitó 'created_at' porque la tabla en Railway no contiene esa columna
    const [rows] = await db.query(
      `SELECT id, nombres, apellidos, cedula, rol, estado
       FROM usuarios
       ORDER BY apellidos ASC`
    );
    
    // Retornamos array vacío si no hay datos para que el frontend no explote
    return res.json(rows || []);
  } catch (err) {
    console.error("❌ Error al listar usuarios:", err);
    return res.status(500).json({ error: "Error al obtener la lista de personal" });
  }
});

/**
 * 4. PUT /api/admin/usuarios/:id/estado
 * (SOLO ADMIN) Permite dar de baja o activar personal.
 */
router.put("/usuarios/:id/estado", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return res.status(400).json({ error: "Estado inválido (Solo ACTIVO o INACTIVO)" });
    }

    const [result] = await db.query(`UPDATE usuarios SET estado = ? WHERE id = ?`, [estado, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json({ success: true, message: "Estado de usuario actualizado ✅", id, estado });
  } catch (err) {
    console.error("❌ Error al actualizar estado del usuario:", err);
    return res.status(500).json({ error: "Error interno al actualizar estado" });
  }
});

/**
 * 5. PUT /api/admin/usuarios/:id
 * (SOLO ADMIN) Edita datos, rol, estado y opcionalmente la contrasena.
 */
router.put("/usuarios/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, cedula, rol, estado, password } = req.body;

    if (!nombres || !apellidos || !cedula || !rol || !estado) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const cedulaLimpia = String(cedula).trim();
    if (!/^\d{10}$/.test(cedulaLimpia)) {
      return res.status(400).json({ error: "La cedula debe tener exactamente 10 digitos" });
    }

    const rolFinal = String(rol).toUpperCase();
    if (!ROLES_PERMITIDOS.includes(rolFinal)) {
      return res.status(400).json({ error: "Rol invalido" });
    }

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return res.status(400).json({ error: "Estado invalido" });
    }

    const [exist] = await db.query(
      "SELECT id FROM usuarios WHERE cedula = ? AND id <> ? LIMIT 1",
      [cedulaLimpia, id]
    );
    if (exist.length > 0) {
      return res.status(409).json({ error: "Ya existe otro usuario con esa cedula" });
    }

    const params = [
      String(nombres).trim(),
      String(apellidos).trim(),
      cedulaLimpia,
      rolFinal,
      estado,
    ];

    let sql = `UPDATE usuarios
               SET nombres = ?, apellidos = ?, cedula = ?, rol = ?, estado = ?`;

    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: "La contrasena debe tener al menos 6 caracteres" });
      }
      const hash = await bcrypt.hash(String(password), 10);
      sql += ", password_hash = ?";
      params.push(hash);
    }

    sql += " WHERE id = ?";
    params.push(id);

    const [result] = await db.query(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json({
      success: true,
      message: "Usuario actualizado correctamente",
      user: { id: Number(id), nombres, apellidos, cedula: cedulaLimpia, rol: rolFinal, estado }
    });
  } catch (err) {
    console.error("Error al editar usuario:", err);
    return res.status(500).json({ error: "Error interno al actualizar usuario" });
  }
});

/**
 * 6. DELETE /api/admin/usuarios/:id
 * (SOLO ADMIN) Elimina si no hay dependencias; si las hay, lo deja inactivo.
 */
router.delete("/usuarios/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({ error: "No puedes eliminar tu propio usuario" });
    }

    try {
      const [result] = await db.query("DELETE FROM usuarios WHERE id = ?", [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      return res.json({ success: true, message: "Usuario eliminado correctamente" });
    } catch (deleteErr) {
      if (!["ER_ROW_IS_REFERENCED_2", "ER_ROW_IS_REFERENCED"].includes(deleteErr.code)) {
        throw deleteErr;
      }

      const [result] = await db.query("UPDATE usuarios SET estado = 'INACTIVO' WHERE id = ?", [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      return res.json({
        success: true,
        message: "El usuario tiene historial vinculado; se marco como INACTIVO"
      });
    }
  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    return res.status(500).json({ error: "Error interno al eliminar usuario" });
  }
});

/**
 * 7. GET /api/admin/materias
 * (SOLO ADMIN) Lista el catalogo completo de materias.
 */
router.get("/materias", authRequired, onlyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, codigo, nombre, estado
       FROM materias
       ORDER BY nombre ASC`
    );
    return res.json(rows || []);
  } catch (err) {
    console.error("Error al listar materias:", err);
    return res.status(500).json({ error: "Error al obtener materias" });
  }
});

/**
 * 8. POST /api/admin/materias/oficiales
 * (SOLO ADMIN) Carga o reactiva el listado oficial inicial.
 */
router.post("/materias/oficiales", authRequired, onlyAdmin, async (req, res) => {
  try {
    const resultados = [];
    for (const materia of MATERIAS_OFICIALES) {
      resultados.push(await upsertMateriaOficial(materia));
    }

    const conflictos = resultados.filter(item => item.status === "conflicto");
    return res.json({
      success: true,
      message: conflictos.length
        ? "Catalogo cargado con algunos conflictos por revisar"
        : "Catalogo oficial de materias cargado correctamente",
      total: resultados.length,
      conflictos,
      resultados,
    });
  } catch (err) {
    console.error("Error al cargar materias oficiales:", err);
    return res.status(500).json({ error: "Error al cargar materias oficiales" });
  }
});

/**
 * 9. POST /api/admin/materias
 * (SOLO ADMIN) Crea una materia nueva en mayusculas.
 */
router.post("/materias", authRequired, onlyAdmin, async (req, res) => {
  try {
    const materia = await guardarMateriaCatalogo(req.body);
    const estado = normalizarTextoMayuscula(req.body.estado || "ACTIVO");
    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return res.status(400).json({ error: "Estado invalido" });
    }
    const [result] = await db.query(
      `INSERT INTO materias (codigo, nombre, estado) VALUES (?, ?, ?)`,
      [materia.codigo, materia.nombre, estado]
    );
    return res.status(201).json({
      success: true,
      message: "Materia creada correctamente",
      materia: { id: result.insertId, ...materia, estado },
    });
  } catch (err) {
    console.error("Error al crear materia:", err);
    return res.status(err.status || 500).json({ error: err.message || "Error al crear materia" });
  }
});

/**
 * 10. PUT /api/admin/materias/:id
 * (SOLO ADMIN) Edita codigo, nombre y estado.
 */
router.put("/materias/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const estado = normalizarTextoMayuscula(req.body.estado || "ACTIVO");

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return res.status(400).json({ error: "Estado invalido" });
    }

    const materia = await guardarMateriaCatalogo(req.body, id);
    const [result] = await db.query(
      `UPDATE materias SET codigo = ?, nombre = ?, estado = ? WHERE id = ?`,
      [materia.codigo, materia.nombre, estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Materia no encontrada" });
    }

    if (estado === "INACTIVO") {
      await db.query(
        `UPDATE asignaciones_docente SET estado = 'INACTIVO' WHERE materia_id = ?`,
        [id]
      );
    }

    return res.json({
      success: true,
      message: "Materia actualizada correctamente",
      materia: { id: Number(id), ...materia, estado },
    });
  } catch (err) {
    console.error("Error al editar materia:", err);
    return res.status(err.status || 500).json({ error: err.message || "Error al editar materia" });
  }
});

/**
 * 11. DELETE /api/admin/materias/:id
 * (SOLO ADMIN) Elimina si no tiene historial; si tiene relaciones, la inactiva.
 */
router.delete("/materias/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    try {
      const [result] = await db.query("DELETE FROM materias WHERE id = ?", [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Materia no encontrada" });
      }
      return res.json({ success: true, message: "Materia eliminada correctamente" });
    } catch (deleteErr) {
      if (!["ER_ROW_IS_REFERENCED_2", "ER_ROW_IS_REFERENCED"].includes(deleteErr.code)) {
        throw deleteErr;
      }

      const [result] = await db.query("UPDATE materias SET estado = 'INACTIVO' WHERE id = ?", [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Materia no encontrada" });
      }
      await db.query(
        `UPDATE asignaciones_docente SET estado = 'INACTIVO' WHERE materia_id = ?`,
        [id]
      );
      return res.json({
        success: true,
        message: "La materia tiene historial vinculado; se marco como INACTIVA",
      });
    }
  } catch (err) {
    console.error("Error al quitar materia:", err);
    return res.status(500).json({ error: "Error al quitar materia" });
  }
});

/**
 * 12. GET /api/admin/cursos
 * (SOLO ADMIN) Lista todos los cursos para habilitar o deshabilitar.
 */
router.get("/cursos", authRequired, onlyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, codigo, nombre, nivel, orden, estado
       FROM cursos
       ORDER BY orden ASC, nombre ASC`
    );
    return res.json(rows || []);
  } catch (err) {
    console.error("Error al listar cursos:", err);
    return res.status(500).json({ error: "Error al obtener cursos" });
  }
});

/**
 * 13. PUT /api/admin/cursos/:id/estado
 * (SOLO ADMIN) Habilita o deshabilita un curso.
 */
router.put("/cursos/:id/estado", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const estado = normalizarTextoMayuscula(req.body.estado);

    if (!["ACTIVO", "INACTIVO"].includes(estado)) {
      return res.status(400).json({ error: "Estado invalido" });
    }

    const [result] = await db.query(
      `UPDATE cursos SET estado = ? WHERE id = ?`,
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    if (estado === "INACTIVO") {
      await db.query(
        `UPDATE asignaciones_docente SET estado = 'INACTIVO' WHERE curso_id = ?`,
        [id]
      );
      await db.query(
        `UPDATE tutorias SET estado = 'INACTIVO' WHERE curso_id = ?`,
        [id]
      ).catch(() => null);
    }

    return res.json({ success: true, message: `Curso ${estado}`, id: Number(id), estado });
  } catch (err) {
    console.error("Error al cambiar estado del curso:", err);
    return res.status(500).json({ error: "Error al actualizar curso" });
  }
});

/**
 * 14. GET /api/admin/docentes-candidatos
 * (SOLO ADMIN) Usuarios que pueden asignarse como docentes.
 */
router.get("/docentes-candidatos", authRequired, onlyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id AS usuario_id, u.nombres, u.apellidos, u.cedula, u.rol, u.estado,
              d.id AS docente_id
       FROM usuarios u
       LEFT JOIN docentes d ON d.usuario_id = u.id
       WHERE u.estado = 'ACTIVO' AND u.rol IN ('PROFESOR', 'ADMIN')
       ORDER BY u.apellidos ASC, u.nombres ASC`
    );
    return res.json(rows || []);
  } catch (err) {
    console.error("Error al listar docentes candidatos:", err);
    return res.status(500).json({ error: "Error al obtener docentes" });
  }
});

/**
 * 15. GET /api/admin/asignaciones-docente
 * (SOLO ADMIN) Lista las materias habilitadas por curso, paralelo y docente.
 */
router.get("/asignaciones-docente", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { curso_id, paralelo_id, periodo_id } = req.query;
    const [adCols, cursosCols] = await Promise.all([
      obtenerColumnasTabla("asignaciones_docente"),
      obtenerColumnasTabla("cursos"),
    ]);
    const profConfig = await obtenerConfigProfesorAsignacion();

    const params = [];
    let where = "WHERE 1=1";
    const tienePeriodo = adCols.has("periodo_id");
    const tieneEstado = adCols.has("estado");
    const selectPeriodo = tienePeriodo ? "ad.periodo_id" : "NULL";
    const selectEstado = tieneEstado ? "ad.estado" : "'ACTIVO'";
    const orderCurso = cursosCols.has("orden") ? "c.orden ASC, c.nombre ASC" : "c.nombre ASC";

    if (curso_id) { where += " AND ad.curso_id = ?"; params.push(curso_id); }
    if (paralelo_id) { where += " AND ad.paralelo_id = ?"; params.push(paralelo_id); }
    if (periodo_id && tienePeriodo) { where += " AND ad.periodo_id = ?"; params.push(periodo_id); }
    if (tieneEstado) { where += " AND ad.estado = 'ACTIVO'"; }

    const joinProfesor = profConfig.tipo === "docente"
      ? `JOIN docentes d ON d.id = ad.${profConfig.col}
         JOIN usuarios u ON u.id = d.usuario_id`
      : `JOIN usuarios u ON u.id = ad.${profConfig.col}
         LEFT JOIN docentes d ON d.usuario_id = u.id`;

    const [rows] = await db.query(
      `SELECT ad.id, ad.${profConfig.col} AS docente_id, ad.materia_id, ad.curso_id, ad.paralelo_id,
              ${selectPeriodo} AS periodo_id, ${selectEstado} AS estado,
              m.codigo AS materia_codigo, m.nombre AS materia,
              c.nombre AS curso, p.nombre AS paralelo,
              u.id AS usuario_id, u.nombres AS docente_nombres, u.apellidos AS docente_apellidos
       FROM asignaciones_docente ad
       JOIN materias m ON m.id = ad.materia_id
       JOIN cursos c ON c.id = ad.curso_id
       JOIN paralelos p ON p.id = ad.paralelo_id
       ${joinProfesor}
       ${where}
       ORDER BY ${orderCurso}, p.nombre ASC, m.nombre ASC`,
      params
    );

    return res.json(rows || []);
  } catch (err) {
    console.error("Error al listar asignaciones docentes:", err);
    return res.status(500).json({
      error: "Error al obtener asignaciones docentes",
      detail: process.env.NODE_ENV === "production" ? undefined : err.message
    });
  }
});

/**
 * 16. POST /api/admin/asignaciones-docente
 * (SOLO ADMIN) Habilita una materia para un curso/paralelo y profesor.
 */
router.post("/asignaciones-docente", authRequired, onlyAdmin, async (req, res) => {
  try {
    const {
      usuario_id,
      materia_id,
      curso_id,
      paralelo_id,
      periodo_id,
    } = req.body;

    const periodoFinal = periodo_id || await obtenerPeriodoActivoId();
    if (!usuario_id || !materia_id || !curso_id || !paralelo_id || !periodoFinal) {
      return res.status(400).json({
        error: "Faltan datos: usuario, materia, curso, paralelo o periodo activo"
      });
    }

    const [[curso], [materia], [paralelo]] = await Promise.all([
      db.query(`SELECT id FROM cursos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1`, [curso_id]),
      db.query(`SELECT id FROM materias WHERE id = ? AND estado = 'ACTIVO' LIMIT 1`, [materia_id]),
      db.query(`SELECT id FROM paralelos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1`, [paralelo_id]),
    ]);

    if (!curso.length) return res.status(400).json({ error: "El curso no esta activo" });
    if (!materia.length) return res.status(400).json({ error: "La materia no esta activa" });
    if (!paralelo.length) return res.status(400).json({ error: "El paralelo no esta activo" });

    const adCols = await obtenerColumnasTabla("asignaciones_docente");
    const profConfig = await obtenerConfigProfesorAsignacion();
    const tienePeriodo = adCols.has("periodo_id");
    const tieneEstado = adCols.has("estado");
    const docenteId = await asegurarDocenteDesdeUsuario(usuario_id);
    const profesorValor = profConfig.tipo === "docente" ? docenteId : usuario_id;
    const estadoFiltro = tieneEstado ? " AND ad.estado = 'ACTIVO'" : "";
    const periodoFiltro = tienePeriodo ? " AND ad.periodo_id = ?" : "";
    const periodoParams = tienePeriodo ? [periodoFinal] : [];

    const [duplicadaActiva] = await db.query(
      `SELECT ad.id
       FROM asignaciones_docente ad
       WHERE ad.materia_id = ? AND ad.curso_id = ? AND ad.paralelo_id = ?
         ${periodoFiltro}${estadoFiltro}
       LIMIT 1`,
      [materia_id, curso_id, paralelo_id, ...periodoParams]
    );

    if (duplicadaActiva.length) {
      const [result] = await db.query(
        `UPDATE asignaciones_docente
         SET ${profConfig.col} = ?${tieneEstado ? ", estado = 'ACTIVO'" : ""}
         WHERE id = ?`,
        [profesorValor, duplicadaActiva[0].id]
      );
      return res.json({
        success: true,
        message: "Asignacion actualizada con el profesor seleccionado",
        id: duplicadaActiva[0].id,
        changed: result.affectedRows,
      });
    }

    const [inactiva] = await db.query(
      `SELECT id
       FROM asignaciones_docente
       WHERE materia_id = ? AND curso_id = ? AND paralelo_id = ?${tienePeriodo ? " AND periodo_id = ?" : ""}
       LIMIT 1`,
      [materia_id, curso_id, paralelo_id, ...periodoParams]
    );

    if (inactiva.length) {
      await db.query(
        `UPDATE asignaciones_docente
         SET ${profConfig.col} = ?${tieneEstado ? ", estado = 'ACTIVO'" : ""}
         WHERE id = ?`,
        [profesorValor, inactiva[0].id]
      );
      return res.json({
        success: true,
        message: "Asignacion reactivada correctamente",
        id: inactiva[0].id,
      });
    }

    const columnas = [profConfig.col, "materia_id", "curso_id", "paralelo_id"];
    const valores = [profesorValor, materia_id, curso_id, paralelo_id];
    if (tienePeriodo) {
      columnas.push("periodo_id");
      valores.push(periodoFinal);
    }
    if (tieneEstado) {
      columnas.push("estado");
      valores.push("ACTIVO");
    }
    const placeholders = columnas.map(() => "?").join(", ");

    const [result] = await db.query(
      `INSERT INTO asignaciones_docente
       (${columnas.join(", ")})
       VALUES (${placeholders})`,
      valores
    );

    return res.status(201).json({
      success: true,
      message: "Materia asignada al curso y profesor",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Error al crear asignacion docente:", err);
    return res.status(err.status || 500).json({
      error: err.message || "Error al crear asignacion docente"
    });
  }
});

/**
 * 17. DELETE /api/admin/asignaciones-docente/:id
 * (SOLO ADMIN) Quita la materia del curso para el periodo activo.
 */
router.delete("/asignaciones-docente/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      `UPDATE asignaciones_docente SET estado = 'INACTIVO' WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Asignacion no encontrada" });
    }

    return res.json({
      success: true,
      message: "Materia quitada del curso para el periodo activo"
    });
  } catch (err) {
    console.error("Error al quitar asignacion docente:", err);
    return res.status(500).json({ error: "Error al quitar asignacion" });
  }
});

/**
 * 18. GET /api/admin/tutorias
 * (SOLO ADMIN) Lista los profesores tutores por curso/paralelo/periodo.
 */
router.get("/tutorias", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { curso_id, paralelo_id, periodo_id } = req.query;
    const periodoFinal = periodo_id || await obtenerPeriodoActivoId();
    const cursosCols = await obtenerColumnasTabla("cursos");
    const orderCurso = cursosCols.has("orden") ? "c.orden ASC, c.nombre ASC" : "c.nombre ASC";
    const params = [];
    let where = "WHERE t.estado = 'ACTIVO'";

    if (curso_id) { where += " AND t.curso_id = ?"; params.push(curso_id); }
    if (paralelo_id) { where += " AND t.paralelo_id = ?"; params.push(paralelo_id); }
    if (periodoFinal) { where += " AND t.periodo_id = ?"; params.push(periodoFinal); }

    const [rows] = await db.query(
      `SELECT t.id, t.docente_usuario_id AS usuario_id, t.curso_id, t.paralelo_id,
              t.periodo_id, t.estado,
              c.nombre AS curso, p.nombre AS paralelo,
              u.nombres AS tutor_nombres, u.apellidos AS tutor_apellidos, u.rol AS tutor_rol
       FROM tutorias t
       JOIN cursos c ON c.id = t.curso_id
       JOIN paralelos p ON p.id = t.paralelo_id
       JOIN usuarios u ON u.id = t.docente_usuario_id
       ${where}
       ORDER BY ${orderCurso}, p.nombre ASC, u.apellidos ASC`,
      params
    );

    return res.json(rows || []);
  } catch (err) {
    console.error("Error al listar tutorias:", err);
    return res.status(500).json({ error: "Error al obtener tutorias" });
  }
});

/**
 * 19. POST /api/admin/tutorias
 * (SOLO ADMIN) Asigna o cambia el tutor opcional de un curso/paralelo.
 */
router.post("/tutorias", authRequired, onlyAdmin, async (req, res) => {
  try {
    const { usuario_id, curso_id, paralelo_id, periodo_id } = req.body;
    const periodoFinal = periodo_id || await obtenerPeriodoActivoId();

    if (!usuario_id || !curso_id || !paralelo_id || !periodoFinal) {
      return res.status(400).json({ error: "Faltan datos para asignar tutor" });
    }

    const [[usuario], [curso], [paralelo]] = await Promise.all([
      db.query(`SELECT id, rol FROM usuarios WHERE id = ? AND estado = 'ACTIVO' AND rol IN ('PROFESOR','ADMIN') LIMIT 1`, [usuario_id]),
      db.query(`SELECT id FROM cursos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1`, [curso_id]),
      db.query(`SELECT id FROM paralelos WHERE id = ? AND estado = 'ACTIVO' LIMIT 1`, [paralelo_id]),
    ]);

    if (!usuario.length) return res.status(400).json({ error: "Seleccione un profesor activo" });
    if (!curso.length) return res.status(400).json({ error: "El curso no esta activo" });
    if (!paralelo.length) return res.status(400).json({ error: "El paralelo no esta activo" });

    await asegurarDocenteDesdeUsuario(usuario_id);

    await db.query(
      `UPDATE tutorias
       SET estado = 'INACTIVO'
       WHERE curso_id = ? AND paralelo_id = ? AND periodo_id = ? AND estado = 'ACTIVO'`,
      [curso_id, paralelo_id, periodoFinal]
    );

    const [previa] = await db.query(
      `SELECT id FROM tutorias
       WHERE curso_id = ? AND paralelo_id = ? AND periodo_id = ? AND docente_usuario_id = ?
       LIMIT 1`,
      [curso_id, paralelo_id, periodoFinal, usuario_id]
    );

    if (previa.length) {
      await db.query(
        `UPDATE tutorias SET estado = 'ACTIVO' WHERE id = ?`,
        [previa[0].id]
      );
      return res.json({ success: true, id: previa[0].id, message: "Tutor actualizado" });
    }

    const [result] = await db.query(
      `INSERT INTO tutorias (docente_usuario_id, curso_id, paralelo_id, periodo_id, estado)
       VALUES (?, ?, ?, ?, 'ACTIVO')`,
      [usuario_id, curso_id, paralelo_id, periodoFinal]
    );

    return res.status(201).json({ success: true, id: result.insertId, message: "Tutor asignado" });
  } catch (err) {
    console.error("Error al asignar tutoria:", err);
    return res.status(500).json({ error: err.message || "Error al asignar tutor" });
  }
});

/**
 * 20. DELETE /api/admin/tutorias/:id
 * (SOLO ADMIN) Quita el tutor de un curso/paralelo.
 */
router.delete("/tutorias/:id", authRequired, onlyAdmin, async (req, res) => {
  try {
    const [result] = await db.query(
      `UPDATE tutorias SET estado = 'INACTIVO' WHERE id = ?`,
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: "Tutoria no encontrada" });
    }

    return res.json({ success: true, message: "Tutor quitado del curso" });
  } catch (err) {
    console.error("Error al quitar tutoria:", err);
    return res.status(500).json({ error: "Error al quitar tutor" });
  }
});

module.exports = router;
