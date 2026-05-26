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

module.exports = router;
