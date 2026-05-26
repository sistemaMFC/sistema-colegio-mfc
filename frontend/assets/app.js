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

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getCurrentRole() {
    return parseJWT(getToken())?.rol || getUser()?.rol || "";
}

function currentUserIsAdmin() {
    return getCurrentRole() === "ADMIN";
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
    const requestOptions = { ...options, headers };

    if (requestOptions.body && typeof requestOptions.body === "object" && !(requestOptions.body instanceof FormData)) {
        requestOptions.body = JSON.stringify(requestOptions.body);
    }

    if (!(requestOptions.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }
    
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, requestOptions);
    
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
        materias: ["Materias", "Catalogo oficial en mayusculas"],
        "cursos-admin": ["Cursos", "Habilitacion de cursos, materias y profesores"],
        estudiantes: ["Estudiantes", "Base de datos global"],
        matriculas: ["Matrículas", "Gestión por Cursos"],
        pagos: ["Pagos", "Control de pensiones y Colecturía"],
        usuarios: ["Usuarios", "Personal del Colegio"],
    };
    
    const [t, s] = titles[view] || ["Panel", ""];
    if($("#pageTitle")) $("#pageTitle").textContent = t;
    if($("#pageSubtitle")) $("#pageSubtitle").textContent = s;

    // Disparadores de lógica por vista
    if (view === 'dashboard') actualizarDashboard();
    if (view === 'usuarios') cargarUsuarios();
    if (view === 'materias') cargarMaterias();
    if (view === 'cursos-admin') cargarCursosAdmin();
    if (view === 'matriculas' && typeof renderizarCursos === 'function') renderizarCursos();
    if (view === 'estudiantes' && typeof mostrarModuloEstudiantes === 'function') mostrarModuloEstudiantes();
    if (view === 'academico' && typeof mostrarModuloAcademico === 'function') {
        mostrarModuloAcademico();
    }
    // --- MODIFICACIÓN PARA PAGOS ---
    if (view === 'pagos' && typeof inicializarModuloPagos === 'function') {
        inicializarModuloPagos();
    }
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
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">⚠️ No se pudo cargar la lista</td></tr>`;
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

let usuariosCache = [];

async function cargarUsuariosMejorado() {
    const tbody = $("#tblUsuarios tbody");
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">Sincronizando personal...</td></tr>`;
        const rows = await api("/api/admin/usuarios");
        usuariosCache = rows || [];
        tbody.innerHTML = "";

        if (!usuariosCache.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="muted text-center">No hay personal registrado</td></tr>`;
            return;
        }

        const user = getUser();
        usuariosCache.forEach(u => {
            const badgeRol = u.rol === "ADMIN" ? "ok" : "warn";
            const badgeEstado = u.estado === "ACTIVO" ? "ok" : "warn";
            const nombreCompleto = `${u.apellidos}, ${u.nombres}`;
            const accionesAdmin = currentUserIsAdmin()
                ? `
                    <button class="btn-soft" style="padding:6px 9px;font-size:12px" onclick="abrirModalEditarUsuario(${u.id})">Editar</button>
                    ${Number(user?.id) === Number(u.id)
                        ? ""
                        : `<button class="btn-soft" style="padding:6px 9px;font-size:12px" onclick="eliminarUsuario(${u.id})">Eliminar</button>`}
                  `
                : `<span class="muted">Solo admin</span>`;

            tbody.innerHTML += `
                <tr>
                    <td>${escapeHTML(u.id)}</td>
                    <td style="text-transform: uppercase; font-weight: bold;">${escapeHTML(nombreCompleto)}</td>
                    <td>${escapeHTML(u.cedula)}</td>
                    <td><span class="badge ${badgeRol}">${escapeHTML(u.rol)}</span></td>
                    <td><span class="badge ${badgeEstado}">${escapeHTML(u.estado || "ACTIVO")}</span></td>
                    <td>${accionesAdmin}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error al cargar usuarios:", err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">No se pudo cargar la lista</td></tr>`;
    }
}

function cerrarModalSistema(id) {
    document.getElementById(id)?.remove();
}

function crearOverlaySistema(id, titulo, bodyHTML) {
    cerrarModalSistema(id);
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:2000;display:flex;align-items:center;justify-content:center;padding:18px;";
    overlay.innerHTML = `
        <div class="card" style="width:min(720px,100%);max-height:92vh;overflow:auto;">
            <div class="card-head">
                <h3>${escapeHTML(titulo)}</h3>
                <button class="btn-soft" onclick="cerrarModalSistema('${id}')">Cerrar</button>
            </div>
            <div style="padding:14px">${bodyHTML}</div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function abrirModalPerfil() {
    try {
        const perfil = await api("/auth/me");
        crearOverlaySistema("modalPerfilUsuario", "Mi perfil", `
            <div class="grid-2">
                <form class="form" onsubmit="guardarMiPerfil(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nombres</label>
                            <input name="nombres" value="${escapeHTML(perfil.nombres)}" required>
                        </div>
                        <div class="form-group">
                            <label>Apellidos</label>
                            <input name="apellidos" value="${escapeHTML(perfil.apellidos)}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Cedula</label>
                        <input name="cedula" maxlength="10" value="${escapeHTML(perfil.cedula)}" required>
                    </div>
                    <div class="form-group">
                        <label>Rol</label>
                        <input value="${escapeHTML(perfil.rol)}" disabled>
                    </div>
                    <button class="btn" type="submit">Guardar perfil</button>
                </form>
                <form class="form" onsubmit="guardarMiPassword(event)">
                    <div class="form-group">
                        <label>Contrasena actual</label>
                        <input type="password" name="current_password" required>
                    </div>
                    <div class="form-group">
                        <label>Nueva contrasena</label>
                        <input type="password" name="new_password" minlength="6" required>
                    </div>
                    <button class="btn" type="submit">Cambiar contrasena</button>
                </form>
            </div>
        `);
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function guardarMiPerfil(event) {
    event.preventDefault();
    const form = event.target;
    try {
        const data = await api("/auth/me", {
            method: "PUT",
            body: {
                nombres: form.nombres.value.trim(),
                apellidos: form.apellidos.value.trim(),
                cedula: form.cedula.value.trim(),
            }
        });
        localStorage.setItem("mfc_user", JSON.stringify(data.user));
        fillUserUI();
        cerrarModalSistema("modalPerfilUsuario");
        showAlert("ok", "Perfil actualizado");
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function guardarMiPassword(event) {
    event.preventDefault();
    const form = event.target;
    try {
        await api("/auth/me/password", {
            method: "PUT",
            body: {
                current_password: form.current_password.value,
                new_password: form.new_password.value,
            }
        });
        form.reset();
        showAlert("ok", "Contrasena actualizada");
    } catch (err) {
        showAlert("bad", err.message);
    }
}

function abrirModalEditarUsuario(id) {
    const u = usuariosCache.find(item => Number(item.id) === Number(id));
    if (!u) {
        showAlert("bad", "Usuario no encontrado en la lista");
        return;
    }

    crearOverlaySistema("modalEditarUsuario", `Editar usuario #${id}`, `
        <form class="form" onsubmit="guardarUsuarioAdmin(event, ${id})">
            <div class="form-row">
                <div class="form-group">
                    <label>Nombres</label>
                    <input name="nombres" value="${escapeHTML(u.nombres)}" required>
                </div>
                <div class="form-group">
                    <label>Apellidos</label>
                    <input name="apellidos" value="${escapeHTML(u.apellidos)}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Cedula</label>
                    <input name="cedula" maxlength="10" value="${escapeHTML(u.cedula)}" required>
                </div>
                <div class="form-group">
                    <label>Rol</label>
                    <select name="rol">
                        <option value="ADMIN" ${u.rol === "ADMIN" ? "selected" : ""}>Administrador</option>
                        <option value="SECRETARIA" ${u.rol === "SECRETARIA" ? "selected" : ""}>Secretaria</option>
                        <option value="COLECTOR" ${u.rol === "COLECTOR" ? "selected" : ""}>Colector</option>
                        <option value="PROFESOR" ${u.rol === "PROFESOR" ? "selected" : ""}>Profesor</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Estado</label>
                    <select name="estado">
                        <option value="ACTIVO" ${u.estado === "ACTIVO" ? "selected" : ""}>ACTIVO</option>
                        <option value="INACTIVO" ${u.estado === "INACTIVO" ? "selected" : ""}>INACTIVO</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nueva contrasena admin (opcional)</label>
                    <input type="password" name="password" minlength="6" placeholder="Dejar vacio para no cambiar">
                </div>
            </div>
            <button class="btn" type="submit">Guardar cambios</button>
        </form>
    `);
}

async function guardarUsuarioAdmin(event, id) {
    event.preventDefault();
    const form = event.target;
    const payload = {
        nombres: form.nombres.value.trim(),
        apellidos: form.apellidos.value.trim(),
        cedula: form.cedula.value.trim(),
        rol: form.rol.value,
        estado: form.estado.value,
    };

    if (form.password.value) payload.password = form.password.value;

    try {
        await api(`/api/admin/usuarios/${id}`, { method: "PUT", body: payload });
        cerrarModalSistema("modalEditarUsuario");
        showAlert("ok", "Usuario actualizado");
        await cargarUsuarios();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function eliminarUsuario(id) {
    const u = usuariosCache.find(item => Number(item.id) === Number(id));
    const nombre = u ? `${u.apellidos}, ${u.nombres}` : `ID ${id}`;
    if (!confirm(`Eliminar usuario ${nombre}? Si tiene historial, se marcara como INACTIVO.`)) return;

    try {
        const data = await api(`/api/admin/usuarios/${id}`, { method: "DELETE" });
        showAlert("ok", data.message || "Usuario eliminado");
        await cargarUsuarios();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

cargarUsuarios = cargarUsuariosMejorado;

/* =========================
    LOGICA DE MATERIAS
========================= */

let materiasCache = [];

function normalizarMayuscula(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

async function cargarMaterias() {
    const tbody = $("#tblMaterias tbody");
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Cargando materias...</td></tr>`;
        const rows = await api("/api/admin/materias");
        materiasCache = rows || [];
        tbody.innerHTML = "";

        if (!materiasCache.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="muted text-center">No hay materias registradas</td></tr>`;
            return;
        }

        materiasCache.forEach(materia => {
            const badgeEstado = materia.estado === "ACTIVO" ? "ok" : "warn";
            tbody.innerHTML += `
                <tr>
                    <td>${escapeHTML(materia.id)}</td>
                    <td><strong>${escapeHTML(materia.codigo)}</strong></td>
                    <td style="font-weight:800;text-transform:uppercase;">${escapeHTML(materia.nombre)}</td>
                    <td><span class="badge ${badgeEstado}">${escapeHTML(materia.estado || "ACTIVO")}</span></td>
                    <td>
                        <div class="actions-inline">
                            <button class="btn-soft" style="padding:6px 9px;font-size:12px" onclick="abrirModalEditarMateria(${materia.id})">Editar</button>
                            <button class="btn-soft" style="padding:6px 9px;font-size:12px" onclick="quitarMateria(${materia.id})">Quitar</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error al cargar materias:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">No se pudo cargar materias</td></tr>`;
    }
}

async function crearMateria(form) {
    const payload = {
        codigo: normalizarMayuscula(form.codigo.value),
        nombre: normalizarMayuscula(form.nombre.value),
        estado: normalizarMayuscula(form.estado.value || "ACTIVO"),
    };

    try {
        await api("/api/admin/materias", { method: "POST", body: payload });
        showAlert("ok", "Materia guardada en mayusculas");
        form.reset();
        await cargarMaterias();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function cargarMateriasOficiales() {
    if (!confirm("Cargar o reactivar el listado oficial de materias en MAYUSCULAS?")) return;

    try {
        const data = await api("/api/admin/materias/oficiales", { method: "POST" });
        const conflictos = data.conflictos?.length || 0;
        showAlert(conflictos ? "bad" : "ok", data.message || "Catalogo cargado");
        await cargarMaterias();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

function abrirModalEditarMateria(id) {
    const materia = materiasCache.find(item => Number(item.id) === Number(id));
    if (!materia) {
        showAlert("bad", "Materia no encontrada en la lista");
        return;
    }

    crearOverlaySistema("modalEditarMateria", `Editar materia #${id}`, `
        <form class="form" onsubmit="guardarMateriaAdmin(event, ${id})">
            <div class="form-row">
                <div class="form-group">
                    <label>Codigo</label>
                    <input name="codigo" maxlength="20" value="${escapeHTML(materia.codigo)}" style="text-transform:uppercase;" required>
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select name="estado">
                        <option value="ACTIVO" ${materia.estado === "ACTIVO" ? "selected" : ""}>ACTIVO</option>
                        <option value="INACTIVO" ${materia.estado === "INACTIVO" ? "selected" : ""}>INACTIVO</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Nombre</label>
                <input name="nombre" value="${escapeHTML(materia.nombre)}" style="text-transform:uppercase;" required>
            </div>
            <button class="btn" type="submit">Guardar materia</button>
        </form>
    `);
}

async function guardarMateriaAdmin(event, id) {
    event.preventDefault();
    const form = event.target;
    const payload = {
        codigo: normalizarMayuscula(form.codigo.value),
        nombre: normalizarMayuscula(form.nombre.value),
        estado: normalizarMayuscula(form.estado.value),
    };

    try {
        await api(`/api/admin/materias/${id}`, { method: "PUT", body: payload });
        cerrarModalSistema("modalEditarMateria");
        showAlert("ok", "Materia actualizada");
        await cargarMaterias();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function quitarMateria(id) {
    const materia = materiasCache.find(item => Number(item.id) === Number(id));
    const nombre = materia ? materia.nombre : `ID ${id}`;
    if (!confirm(`Quitar materia ${nombre}? Si tiene historial, se marcara como INACTIVA.`)) return;

    try {
        const data = await api(`/api/admin/materias/${id}`, { method: "DELETE" });
        showAlert("ok", data.message || "Materia quitada");
        await cargarMaterias();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

/* =========================
    CONFIGURACIÓN INICIAL
========================= */

/* =========================
    LOGICA DE CURSOS Y ASIGNACIONES
========================= */

let cursosAdminCache = [];
let paralelosAdminCache = [];
let materiasAdminCache = [];
let docentesAdminCache = [];
let asignacionesAdminCache = [];
let periodoAdminActivo = null;

function llenarSelect(select, rows, getValue, getLabel, emptyLabel = "Seleccione") {
    if (!select) return;
    select.innerHTML = `<option value="">${emptyLabel}</option>`;
    rows.forEach(row => {
        const opt = document.createElement("option");
        opt.value = getValue(row);
        opt.textContent = getLabel(row);
        select.appendChild(opt);
    });
}

async function cargarCursosAdmin() {
    const tbodyCursos = $("#tblCursosAdmin tbody");
    const tbodyAsignaciones = $("#tblAsignacionesCurso tbody");
    if (tbodyCursos) tbodyCursos.innerHTML = `<tr><td colspan="5" class="text-center">Cargando cursos...</td></tr>`;
    if (tbodyAsignaciones) tbodyAsignaciones.innerHTML = `<tr><td colspan="5" class="text-center">Cargando asignaciones...</td></tr>`;

    try {
        const [cursos, cp, materias, docentes, periodo, asignaciones] = await Promise.all([
            api("/api/admin/cursos"),
            api("/api/academico/cursos-paralelos"),
            api("/api/academico/materias"),
            api("/api/admin/docentes-candidatos"),
            api("/api/academico/periodo-activo"),
            api("/api/admin/asignaciones-docente"),
        ]);

        cursosAdminCache = cursos || [];
        paralelosAdminCache = cp.paralelos || [];
        materiasAdminCache = materias || [];
        docentesAdminCache = docentes || [];
        periodoAdminActivo = periodo;
        asignacionesAdminCache = asignaciones || [];

        renderCursosAdmin();
        llenarFormularioAsignacionCurso();
        renderAsignacionesCurso();
    } catch (err) {
        console.error("Error al cargar administracion de cursos:", err);
        if (tbodyCursos) tbodyCursos.innerHTML = `<tr><td colspan="5" class="text-center text-danger">No se pudo cargar cursos</td></tr>`;
        if (tbodyAsignaciones) tbodyAsignaciones.innerHTML = `<tr><td colspan="5" class="text-center text-danger">No se pudo cargar asignaciones</td></tr>`;
        showAlert("bad", err.message);
    }
}

function renderCursosAdmin() {
    const tbody = $("#tblCursosAdmin tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!cursosAdminCache.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="muted text-center">No hay cursos registrados</td></tr>`;
        return;
    }

    cursosAdminCache.forEach(curso => {
        const activo = curso.estado === "ACTIVO";
        tbody.innerHTML += `
            <tr>
                <td>${escapeHTML(curso.id)}</td>
                <td style="font-weight:800;">${escapeHTML(curso.nombre)}</td>
                <td>${escapeHTML(curso.nivel || "-")}</td>
                <td><span class="badge ${activo ? "ok" : "warn"}">${escapeHTML(curso.estado || "INACTIVO")}</span></td>
                <td>
                    <button class="btn-soft" style="padding:6px 9px;font-size:12px"
                            onclick="cambiarEstadoCurso(${curso.id}, '${activo ? "INACTIVO" : "ACTIVO"}')">
                        ${activo ? "Deshabilitar" : "Habilitar"}
                    </button>
                </td>
            </tr>
        `;
    });
}

function llenarFormularioAsignacionCurso() {
    const form = $("#formAsignacionCurso");
    if (!form) return;

    llenarSelect(form.curso_id, cursosAdminCache.filter(c => c.estado === "ACTIVO"), c => c.id, c => c.nombre, "Seleccione curso");
    llenarSelect(form.paralelo_id, paralelosAdminCache, p => p.id, p => `Paralelo ${p.nombre}`, "Seleccione paralelo");
    llenarSelect(form.materia_id, materiasAdminCache, m => m.id, m => `${m.codigo} - ${m.nombre}`, "Seleccione materia");
    llenarSelect(form.usuario_id, docentesAdminCache, d => d.usuario_id, d => `${d.apellidos} ${d.nombres} (${d.rol})`, "Seleccione profesor");
}

function renderAsignacionesCurso() {
    const tbody = $("#tblAsignacionesCurso tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!asignacionesAdminCache.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="muted text-center">No hay materias habilitadas por curso</td></tr>`;
        return;
    }

    asignacionesAdminCache.forEach(asig => {
        const activo = asig.estado === "ACTIVO";
        const docente = `${asig.docente_apellidos || ""} ${asig.docente_nombres || ""}`.trim();
        tbody.innerHTML += `
            <tr>
                <td>${escapeHTML(asig.curso)} / ${escapeHTML(asig.paralelo)}</td>
                <td><strong>${escapeHTML(asig.materia_codigo)}</strong><br>${escapeHTML(asig.materia)}</td>
                <td>${escapeHTML(docente || "-")}</td>
                <td><span class="badge ${activo ? "ok" : "warn"}">${escapeHTML(asig.estado)}</span></td>
                <td>
                    ${activo
                        ? `<button class="btn-soft" style="padding:6px 9px;font-size:12px" onclick="quitarAsignacionCurso(${asig.id})">Quitar</button>`
                        : `<span class="muted">Inactiva</span>`}
                </td>
            </tr>
        `;
    });
}

async function cambiarEstadoCurso(id, estado) {
    if (estado === "INACTIVO" && !confirm("Deshabilitar este curso tambien inactiva sus asignaciones docentes. Continuar?")) return;

    try {
        await api(`/api/admin/cursos/${id}/estado`, { method: "PUT", body: { estado } });
        showAlert("ok", `Curso ${estado}`);
        await cargarCursosAdmin();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function guardarAsignacionCurso(form) {
    const payload = {
        curso_id: form.curso_id.value,
        paralelo_id: form.paralelo_id.value,
        materia_id: form.materia_id.value,
        usuario_id: form.usuario_id.value,
        periodo_id: periodoAdminActivo?.id,
    };

    try {
        await api("/api/admin/asignaciones-docente", { method: "POST", body: payload });
        showAlert("ok", "Materia habilitada para el curso y profesor");
        form.reset();
        await cargarCursosAdmin();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function quitarAsignacionCurso(id) {
    if (!confirm("Quitar esta materia del curso para el periodo activo?")) return;

    try {
        await api(`/api/admin/asignaciones-docente/${id}`, { method: "DELETE" });
        showAlert("ok", "Materia quitada del curso");
        await cargarCursosAdmin();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

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
    $("#btnPerfilTop")?.addEventListener("click", abrirModalPerfil);

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

    const formMateria = $("#formCrearMateria");
    if (formMateria) {
        formMateria.addEventListener("submit", (e) => {
            e.preventDefault();
            crearMateria(e.target);
        });
    }

    const formAsignacionCurso = $("#formAsignacionCurso");
    if (formAsignacionCurso) {
        formAsignacionCurso.addEventListener("submit", (e) => {
            e.preventDefault();
            guardarAsignacionCurso(e.target);
        });
    }

    $("#btnCargarUsuarios")?.addEventListener("click", cargarUsuarios);
    $("#btnCargarMaterias")?.addEventListener("click", cargarMaterias);
    $("#btnSeedMateriasOficiales")?.addEventListener("click", cargarMateriasOficiales);
    $("#btnCargarCursosAdmin")?.addEventListener("click", cargarCursosAdmin);
}

window.actualizarDashboard = actualizarDashboard;
window.cargarUsuarios = cargarUsuarios;
window.abrirModalPerfil = abrirModalPerfil;
window.guardarMiPerfil = guardarMiPerfil;
window.guardarMiPassword = guardarMiPassword;
window.cerrarModalSistema = cerrarModalSistema;
window.abrirModalEditarUsuario = abrirModalEditarUsuario;
window.guardarUsuarioAdmin = guardarUsuarioAdmin;
window.eliminarUsuario = eliminarUsuario;
window.cargarMaterias = cargarMaterias;
window.abrirModalEditarMateria = abrirModalEditarMateria;
window.guardarMateriaAdmin = guardarMateriaAdmin;
window.quitarMateria = quitarMateria;
window.cargarCursosAdmin = cargarCursosAdmin;
window.cambiarEstadoCurso = cambiarEstadoCurso;
window.quitarAsignacionCurso = quitarAsignacionCurso;

(function init() {
    fillUserUI();
    initTheme();
    setupInteractions();
    setActiveView("dashboard");
})();
