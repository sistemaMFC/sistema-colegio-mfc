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

        // ── REDIRECCIÓN POR ROL ──────────────────────────────
        setTimeout(() => {
            const rol = data.user.rol;
            if (rol === "PROFESOR") {
                // El profesor va directo al módulo académico — nada más
                window.location.href = "./profesor-academico.html";
            } else {
                // Admin, Secretaria, Colector → sistema completo
                window.location.href = "./app.html";
            }
        }, 900);

    } catch (err) {
        console.error(err);
        setMsg("Error: El servidor no responde. Verifique su conexión.");
    }
});