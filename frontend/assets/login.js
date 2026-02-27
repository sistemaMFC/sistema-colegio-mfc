const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const cedulaInput = document.getElementById("cedula");
const passInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

const API = "https://sistema-colegio-mfc.onrender.com";

// Limpia mensaje
function setMsg(text, ok = false) {
  msg.textContent = text || "";
  msg.className = ok ? "msg ok" : "msg err";
}

// Solo números en cédula
cedulaInput.addEventListener("input", () => {
  cedulaInput.value = cedulaInput.value.replace(/\D/g, "").slice(0, 10);
});

// Ver/Ocultar contraseña
togglePassword.addEventListener("click", () => {
  const isPass = passInput.type === "password";
  passInput.type = isPass ? "text" : "password";
  togglePassword.textContent = isPass ? "🙈" : "👁";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("");

  const cedula = cedulaInput.value.trim();
  const password = passInput.value;

  if (!cedula || !password) {
    return setMsg("Completa cédula y contraseña.");
  }
  if (!/^\d{10}$/.test(cedula)) {
    return setMsg("La cédula debe tener 10 dígitos.");
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cedula, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return setMsg(data?.error || "No se pudo iniciar sesión.");
    }

    // Guarda sesión
    localStorage.setItem("mfc_token", data.token);
    localStorage.setItem("mfc_user", JSON.stringify(data.user));

    setMsg(`Bienvenido/a ${data.user.nombres} ✅`, true);

    // Redirige a plataforma
    // Si estás en Live Server, esto funciona porque es relativo:
    window.location.href = "./app.html";
  } catch (err) {
    console.error(err);
    setMsg("Error de conexión con el servidor.");
  }
});