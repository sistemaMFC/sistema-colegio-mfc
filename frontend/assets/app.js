// URL DE PRODUCCIÓN
const API_BASE = "https://sistema-colegio-mfc.onrender.com";
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* --- (Sus funciones de sesión, logout y api se mantienen IGUAL) --- */

function setActiveView(view) {
  $$(".menu-item").forEach(b => b.classList.remove("active"));
  const btn = document.querySelector(`.menu-item[data-view="${view}"]`);
  if (btn) btn.classList.add("active");

  $$(".view").forEach(v => v.hidden = true);
  const section = $(`#view-${view}`);
  if (section) section.hidden = false;

  // Actualizar títulos
  const titles = {
    dashboard: ["Dashboard", "Resumen general"],
    matriculas: ["Matrículas", "Gestión por Cursos"],
    pagos: ["Pagos", "Control de pensiones"],
    usuarios: ["Usuarios", "Administración de personal"],
  };
  const [t, s] = titles[view] || ["Panel", ""];
  if($("#pageTitle")) $("#pageTitle").textContent = t;
  if($("#pageSubtitle")) $("#pageSubtitle").textContent = s;

  // --- LO NUEVO: ACTIVAR EL DISEÑO MODULAR ---
  if (view === 'matriculas') {
    // Si la función existe en view-cursos.js, la ejecutamos
    if (typeof renderizarCursos === 'function') {
      renderizarCursos(); 
    }
  }
}

/* --- (Sus funciones de cargarUsuarios y crearUsuario se mantienen IGUAL) --- */

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

  // Logout y demás interacciones que ya tiene...
  $("#btnLogoutSide")?.addEventListener("click", logout);
  $("#btnLogoutTop")?.addEventListener("click", logout);

  // Formulario de usuarios (Se mantiene igual)
  const formUser = $("#formCrearUsuario");
  if (formUser) {
    formUser.addEventListener("submit", (e) => {
      e.preventDefault();
      crearUsuario(e.target);
    });
  }
  $("#btnCargarUsuarios")?.addEventListener("click", cargarUsuarios);
}

// Inicialización
(function init() {
  fillUserUI();
  setupInteractions();
  setActiveView("dashboard");
})();