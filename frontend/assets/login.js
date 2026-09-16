/* ============================================================
   LOGIN - COLEGIO MIGUEL FEBRES CORDERO
   ✅ ACTUALIZADO: Redirección por rol
      PROFESOR    → profesor-academico.html  (solo notas)
      ADMIN       → app.html  (sistema completo)
      SECRETARIA  → app.html
      COLECTOR    → app.html
   ============================================================ */

const form        = document.getElementById("loginForm");
const msg         = document.getElementById("msg");
const cedulaInput = document.getElementById("cedula");
const passInput   = document.getElementById("password");

const API = window.MFC_API_BASE || window.location.origin;

function getUserRoles(user) {
    const direct = Array.isArray(user?.roles) ? user.roles : [];
    const legacy = user?.rol ? [user.rol] : [];
    return Array.from(new Set([...direct, ...legacy].map(r => String(r || "").toUpperCase()))).filter(Boolean);
}

function getHomeByRole(roles) {
    const normalized = Array.isArray(roles) ? roles : [roles];
    const list = normalized.map(r => String(r || "").toUpperCase()).filter(Boolean);

    if (list.includes("ADMIN") || list.includes("ADMINISTRADOR")) return "./app.html";
    if (list.includes("PROFESOR")) return "./profesor-academico.html";
    if (list.includes("PSICOLOGO")) return "./dece.html";
    return "./app.html";
}

function setMsg(text, ok = false) {
    msg.textContent = text || "";
    msg.className   = ok ? "msg ok" : "msg err";
}

// Solo números en cédula
cedulaInput.addEventListener("input", () => {
    cedulaInput.value = cedulaInput.value.replace(/\D/g, "").slice(0, 10);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("Validando credenciales...");

    const cedula   = cedulaInput.value.trim();
    const password = passInput.value;

    try {
        const res  = await fetch(`${API}/auth/login`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ cedula, password }),
        });
        const data = await res.json();

        if (!res.ok) {
            return setMsg(data.error || "Acceso denegado");
        }

        // Guardar sesión
        localStorage.setItem("mfc_token", data.token);
        localStorage.setItem("mfc_user",  JSON.stringify(data.user));

        setMsg(`¡Bienvenido/a ${data.user.nombres}! Redirigiendo...`, true);

        // ── REDIRECCIÓN POR ROL MÚLTIPLE ──────────────────────────────
        setTimeout(() => {
            const roles = getUserRoles(data.user);
            const destination = getHomeByRole(roles);
            window.location.href = destination;
        }, 900);

    } catch (err) {
        console.error(err);
        setMsg("Error: El servidor no responde. Verifique su conexión.");
    }
});