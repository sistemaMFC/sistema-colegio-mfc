/* ========================================================
    SISTEMA COLEGIO MIGUEL FEBRES CORDERO - APP.JS (ACTUALIZADO CON THEME TOGGLE)
    ======================================================== */

const API_BASE = "https://sistema-colegio-mfc.onrender.com";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* =========================
    UTILIDADES Y SESIÓN
========================= */

function getToken() {
  return localStorage.getItem("mfc_token");
}

function getUser() {
  return JSON.parse(localStorage.getItem("mfc_user") || "null");
}

function logout() {
  localStorage.removeItem("mfc_token");
  localStorage.removeItem("mfc_user");
  window.location.href = "./index.html";
}

function parseJWT(token) {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/* =========================
    LÓGICA DE TEMAS (DARK/LIGHT)
========================= */

function initTheme() {
  const btnTheme = $("#btnThemeToggle");
  if (!btnTheme) return;

  // 1. Revisar si ya había un tema guardado
  const savedTheme = localStorage.getItem("mfc_theme") || "dark";
  
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    btnTheme.textContent = "☀️";
  } else {
    btnTheme.textContent = "🌑";
  }

  // 2. Evento de clic para cambiar tema
  btnTheme.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light-mode");
    const newTheme = isLight ? "light" : "dark";
    
    // Guardar preferencia
    localStorage.setItem("mfc_theme", newTheme);
    
    // Cambiar icono
    btnTheme.textContent = isLight ? "☀️" : "🌑";
    
    // Opcional: Alerta sutil
    console.log(`Modo ${newTheme} activado`);
  });
}

/* =========================
    COMUNICACIÓN CON API
========================= */

async function api(path, options = {}) {
  const token = getToken();
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* =========================
    INTERFAZ DE USUARIO (UI)
========================= */

function showAlert(type, msg) {
  const el = $("#alert");
  if (!el) return;
  el.className = `alert ${type}`;
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 3500);
}

function fillUserUI() {
  const token = getToken();
  if (!token) {
    window.location.href = "./index.html";
    return;
  }

  const decoded = parseJWT(token);
  if (!decoded) {
    logout();
    return;
  }

  if (decoded.rol !== "ADMIN") {
    alert("Acceso denegado: Se requiere rol de Administrador.");
    logout();
    return;
  }

  if($("#pillRole")) $("#pillRole").textContent = decoded.rol;

  const user = getUser();
  const nombres = user?.nombres || "Admin";
  const apellidos = user?.apellidos || "";
  const cedula = user?.cedula || decoded.cedula || "-";

  if($("#userName")) $("#userName").textContent = `${nombres} ${apellidos}`.trim();
  if($("#userCedula")) $("#userCedula").textContent = `Cédula: ${cedula}`;
  if($("#avatar")) $("#avatar").textContent = (nombres?.[0] || "A").toUpperCase();
}

function setActiveView(view) {
  $$(".menu-item").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.menu-item[data-view="${view}"]`);
  if (btn) btn.classList.add("active");

  $$(".view").forEach(v => v.hidden = true);
  const section = $(`#view-${view}`);
  if (section) section.hidden = false;

  const titles = {
    dashboard: ["Dashboard", "Resumen general del sistema"],
    matriculas: ["Matrículas", "Gestión por Cursos"],
    pagos: ["Pagos", "Control de pensiones y abonos"],
    usuarios: ["Usuarios", "Administración de personal"],
  };
  
  const [t, s] = titles[view] || ["Panel", ""];
  if($("#pageTitle")) $("#pageTitle").textContent = t;
  if($("#pageSubtitle")) $("#pageSubtitle").textContent = s;

  if (view === 'matriculas') {
    if (typeof renderizarCursos === 'function') {
      renderizarCursos(); 
    }
  }
}

/* =========================
    LÓGICA DE USUARIOS
========================= */

async function cargarUsuarios() {
  try {
    const rows = await api("/api/admin/usuarios", { method: "GET" });
    const tbody = $("#tblUsuarios tbody");
    if(!tbody) return;
    tbody.innerHTML = "";

    if (!rows?.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted">No hay usuarios registrados</td></tr>`;
      return;
    }

    rows.forEach(u => {
      const name = `${u.nombres} ${u.apellidos}`;
      tbody.innerHTML += `
        <tr>
          <td>${u.id}</td>
          <td>${name}</td>
          <td>${u.cedula}</td>
          <td><span class="badge ok">${u.rol}</span></td>
          <td>${u.estado || 'ACTIVO'}</td>
        </tr>
      `;
    });
    showAlert("ok", "Usuarios actualizados ✅");
  } catch (err) {
    showAlert("bad", "Error: " + err.message);
  }
}

async function crearUsuario(form) {
  try {
    const payload = {
      nombres: form.nombres.value.trim(),
      apellidos: form.apellidos.value.trim(),
      cedula: form.cedula.value.trim(),
      password: form.password.value,
      rol: form.rol.value
    };

    await api("/api/admin/usuarios", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    showAlert("ok", "Usuario creado con éxito ✅");
    form.reset();
    await cargarUsuarios();
  } catch (err) {
    showAlert("bad", err.message);
  }
}

/* =========================
    CONFIGURACIÓN INICIAL
========================= */

function setupInteractions() {
  if($("#year")) $("#year").textContent = new Date().getFullYear();

  $("#btnToggleSidebar")?.addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  $$(".menu-item[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      setActiveView(btn.dataset.view);
      $("#sidebar")?.classList.remove("open");
    });
  });

  $$(".quick-btn[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      setActiveView(btn.dataset.view);
    });
  });

  $("#btnLogoutSide")?.addEventListener("click", logout);
  $("#btnLogoutTop")?.addEventListener("click", logout);

  $$("[data-toggle-pass]").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      if (!input) return;
      const isPass = input.type === "password";
      input.type = isPass ? "text" : "password";
      btn.textContent = isPass ? "🙈" : "👁";
    });
  });

  const formUser = $("#formCrearUsuario");
  if (formUser) {
    formUser.addEventListener("submit", (e) => {
      e.preventDefault();
      crearUsuario(e.target);
    });
  }

  $("#btnCargarUsuarios")?.addEventListener("click", cargarUsuarios);

  $("#btnDemoMatriculas")?.addEventListener("click", () => {
    if (typeof renderizarCursos === 'function') {
        renderizarCursos();
        showAlert("ok", "Sincronizando con Railway...");
    }
  });
}

(function init() {
  fillUserUI();
  initTheme(); // <--- NUEVO: Inicia la lógica de Dark/Light
  setupInteractions();
  setActiveView("dashboard");
})();