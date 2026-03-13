/* ========================================================
    SISTEMA COLEGIO MIGUEL FEBRES CORDERO - APP.JS 
    VERSIÓN INTEGRADA: DASHBOARD, USUARIOS Y MÓDULOS
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
    LÓGICA DE TEMAS (FIJO LIGHT)
========================= */

function initTheme() {
    const btnTheme = $("#btnThemeToggle");
    document.body.classList.add("light-mode");
    localStorage.setItem("mfc_theme", "light");

    if (btnTheme) {
        btnTheme.textContent = "☀️";
        btnTheme.addEventListener("click", () => {
            showAlert("ok", "Modo claro activado para mayor claridad ☀️");
        });
    }
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
    
    // Si es 401 o 403, redirigir al login por seguridad
    if (res.status === 401 || res.status === 403) {
        console.warn("Sesión inválida o permisos insuficientes");
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg = data?.error || `Error ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

/* =========================
    LÓGICA DEL DASHBOARD
========================= */

async function actualizarDashboard() {
    const listaBody = $("#listaDashboardMatriculados");
    const kpiMatriculados = $("#kpiMatriculados");

    try {
        const [cursosData, estudiantes] = await Promise.all([
            api("/api/admin/cursos/estadisticas"),
            api("/api/students")
        ]);
        
        const matriculados = estudiantes.filter(est => est.estado === 'ACTIVO');
        if (kpiMatriculados) kpiMatriculados.textContent = matriculados.length;

        if (listaBody) {
            listaBody.innerHTML = "";
            if (matriculados.length === 0) {
                listaBody.innerHTML = `<tr><td colspan="5" class="muted text-center">No hay alumnos matriculados aún</td></tr>`;
                return;
            }

            const recientes = [...matriculados].sort((a, b) => b.id - a.id).slice(0, 8);

            recientes.forEach(est => {
                const infoCurso = cursosData.find(c => c.id == est.curso_id);
                const nombreCurso = infoCurso ? infoCurso.nombre : `ID: ${est.curso_id}`;

                listaBody.innerHTML += `
                    <tr>
                        <td>${est.cedula_est}</td>
                        <td style="font-weight:bold; text-transform:uppercase;">
                            ${est.apellidos_est}, ${est.nombres_est}
                        </td>
                        <td>${est.cedula_rep || 'S/I'}</td>
                        <td>${nombreCurso}</td>
                        <td><span class="badge ok">MATRICULADO</span></td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        console.error("Error Dashboard:", err);
    }
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
        estudiantes: ["Estudiantes", "Base de datos global"],
        matriculas: ["Matrículas", "Gestión por Cursos"],
        pagos: ["Pagos", "Control de pensiones"],
        usuarios: ["Usuarios", "Personal del Colegio"],
    };
    
    const [t, s] = titles[view] || ["Panel", ""];
    if($("#pageTitle")) $("#pageTitle").textContent = t;
    if($("#pageSubtitle")) $("#pageSubtitle").textContent = s;

    if (view === 'dashboard') actualizarDashboard();
    if (view === 'usuarios') cargarUsuarios();
    if (view === 'matriculas' && typeof renderizarCursos === 'function') renderizarCursos();
    if (view === 'estudiantes' && typeof mostrarModuloEstudiantes === 'function') mostrarModuloEstudiantes();
}

/* =========================
    LÓGICA DE USUARIOS (PERSONAL)
========================= */

async function cargarUsuarios() {
    const tbody = $("#tblUsuarios tbody");
    if(!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">⏳ Sincronizando personal...</td></tr>`;

        const rows = await api("/api/admin/usuarios");
        
        tbody.innerHTML = ""; 

        if (!rows || rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="muted text-center">No hay personal registrado</td></tr>`;
            return;
        }

        rows.forEach(u => {
            // Colores MFC: ok (verde) para ADMIN, warn (amarillo) para otros
            const badgeRol = (u.rol === 'ADMIN') ? 'ok' : 'warn';
            const badgeEstado = (u.estado === 'ACTIVO') ? 'ok' : 'warn';

            tbody.innerHTML += `
                <tr>
                    <td>${u.id}</td>
                    <td style="text-transform: uppercase; font-weight: bold;">${u.apellidos}, ${u.nombres}</td>
                    <td>${u.cedula}</td>
                    <td><span class="badge ${badgeRol}">${u.rol}</span></td>
                    <td><span class="badge ${badgeEstado}">${u.estado || 'ACTIVO'}</span></td>
                </tr>
            `;
        });
        
    } catch (err) {
        console.error("Error al cargar usuarios:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">⚠️ No se pudo cargar la lista (Verifique permisos)</td></tr>`;
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
        await api("/api/admin/usuarios", { method: "POST", body: JSON.stringify(payload) });
        showAlert("ok", "Personal registrado con éxito ✅");
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
}

window.actualizarDashboard = actualizarDashboard;
window.cargarUsuarios = cargarUsuarios;

(function init() {
    fillUserUI();
    initTheme();
    setupInteractions();
    setActiveView("dashboard");
})();