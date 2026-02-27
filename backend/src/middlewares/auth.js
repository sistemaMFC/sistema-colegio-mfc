// POST /auth/login
router.post("/login", async (req, res) => {
  const { cedula, password } = req.body;

  try {
    // 1. Buscamos al usuario por CÉDULA (como pide su doc)
    const [rows] = await pool.query(
      "SELECT id, nombres, apellidos, cedula, password_hash, rol, estado FROM usuarios WHERE cedula = ? LIMIT 1",
      [cedula]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = rows[0];

    // 2. Verificamos si está ACTIVO
    if (user.estado !== 'ACTIVO') {
      return res.status(403).json({ error: "Usuario inactivo. Contacte al administrador." });
    }

    // 3. Validamos contraseña
    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // 4. Actualizamos último login
    await pool.query("UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?", [user.id]);

    // 5. Generamos Token JWT
    const token = jwt.sign(
      { id: user.id, rol: user.rol, cedula: user.cedula },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});