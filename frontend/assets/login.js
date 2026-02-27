const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const cedulaInput = document.getElementById("cedula");
const passInput = document.getElementById("password");

// URL ÚNICA DE PRODUCCIÓN
const API = "https://sistema-colegio-mfc.onrender.com";

function setMsg(text, ok = false) {
  msg.textContent = text || "";
  msg.className = ok ? "msg ok" : "msg err";
}

// Bloqueo de caracteres no numéricos
cedulaInput.addEventListener("input", () => {
  cedulaInput.value = cedulaInput.value.replace(/\D/g, "").slice(0, 10);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("Validando credenciales...");

  const cedula = cedulaInput.value.trim();
  const password = passInput.value;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cedula, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Si el servidor responde 401, mostrará "Contraseña incorrecta" o "Usuario no encontrado"
      return setMsg(data.error || "Acceso denegado");
    }

    // GUARDAR SESIÓN (Sincronizado con assets/app.js)
    localStorage.setItem("mfc_token", data.token);
    localStorage.setItem("mfc_user", JSON.stringify(data.user));

    setMsg(`¡Bienvenido/a ${data.user.nombres}! Redirigiendo...`, true);

    // Ir al Dashboard
    setTimeout(() => {
      window.location.href = "./app.html";
    }, 1000);

  } catch (err) {
    console.error(err);
    setMsg("Error: El servidor no responde. Verifique su conexión.");
  }
});