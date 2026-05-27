const API_BASE = window.MFC_API_BASE || "https://sistema-colegio-mfc.onrender.com";

const state = {
    user: null,
    docente: null,
    asignaciones: [],
    trimestres: [],
    selectedAsignacionId: null,
    selectedTrimestreId: null,
    notasData: null,
    tutorCursos: [],
};

const $ = (selector) => document.querySelector(selector);

function getToken() {
    return localStorage.getItem("mfc_token");
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("mfc_user") || "null");
    } catch (err) {
        return null;
    }
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
    } catch (err) {
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

function applyThemeProfesor() {
    const theme = localStorage.getItem("mfc_theme") || "light";
    document.body.classList.toggle("dark-mode", theme === "dark");
    document.body.classList.toggle("light-mode", theme !== "dark");
}

function getProfilePhotoKey(userId = getStoredUser()?.id || parseJWT(getToken())?.id) {
    return userId ? `mfc_profile_photo_${userId}` : "mfc_profile_photo";
}

function getProfilePhoto(userId) {
    return localStorage.getItem(getProfilePhotoKey(userId));
}

function setAvatarElement(el, name, photo) {
    if (!el) return;
    if (photo) {
        el.textContent = "";
        el.style.backgroundImage = `url("${photo}")`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
    } else {
        el.style.backgroundImage = "";
        el.textContent = (name?.[0] || "P").toUpperCase();
    }
}

function showAlert(type, message) {
    const el = $("#profAlert");
    if (!el) return;
    el.className = `alert ${type}`;
    el.textContent = message;
    el.hidden = false;
    window.clearTimeout(showAlert._timer);
    showAlert._timer = window.setTimeout(() => {
        el.hidden = true;
    }, 3500);
}

function cerrarModalProfesor(id) {
    document.getElementById(id)?.remove();
}

function crearModalProfesor(id, titulo, bodyHTML) {
    cerrarModalProfesor(id);
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:2000;display:flex;align-items:center;justify-content:center;padding:18px;";
    overlay.innerHTML = `
        <div class="card" style="width:min(720px,100%);max-height:92vh;overflow:auto;">
            <div class="card-head">
                <h3>${escapeHTML(titulo)}</h3>
                <div class="actions-inline">
                    <button class="btn-soft" onclick="cerrarModalProfesor('${id}')">Retroceder</button>
                    <button class="btn-soft" onclick="cerrarModalProfesor('${id}')">Cerrar</button>
                </div>
            </div>
            <div style="padding:14px">${bodyHTML}</div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function api(path, options = {}) {
    const token = getToken();
    if (!token) {
        logout();
        throw new Error("Sesion expirada");
    }

    const headers = { ...(options.headers || {}) };
    const requestOptions = { ...options, headers };

    if (requestOptions.body && typeof requestOptions.body === "object" && !(requestOptions.body instanceof FormData)) {
        requestOptions.body = JSON.stringify(requestOptions.body);
    }

    if (!(requestOptions.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, requestOptions);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
        logout();
        throw new Error("Sesion expirada");
    }

    if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
    }

    return data;
}

function requireSession() {
    const token = getToken();
    const decoded = token ? parseJWT(token) : null;
    if (!decoded) {
        logout();
        return null;
    }

    const expired = decoded.exp && decoded.exp * 1000 < Date.now();
    if (expired) {
        logout();
        return null;
    }

    return decoded;
}

function fillUserUI(decoded, profile) {
    const stored = getStoredUser() || {};
    const nombres = profile?.nombres || stored.nombres || "Profesor";
    const apellidos = profile?.apellidos || stored.apellidos || "";
    const cedula = profile?.cedula || decoded?.cedula || "-";
    const rol = profile?.rol || decoded?.rol || "PROFESOR";

    $("#profName").textContent = `${nombres} ${apellidos}`.trim();
    $("#profCedula").textContent = `Cedula: ${cedula}`;
    $("#profRole").textContent = rol;
    setAvatarElement($("#profAvatar"), nombres, getProfilePhoto(profile?.id || stored.id || decoded?.id));
}

function renderAssignments() {
    const panel = $("#profAssignments");

    if (!state.docente?.id && !state.asignaciones.length) {
        panel.innerHTML = `<div class="prof-empty">No hay docente activo vinculado a este usuario.</div>`;
        $("#profNotesPanel").innerHTML = `<div class="prof-empty">Contacte al administrador para vincular el usuario con un docente.</div>`;
        return;
    }

    if (!state.asignaciones.length) {
        panel.innerHTML = `<div class="prof-empty">No tiene materias asignadas en el periodo activo.</div>`;
        $("#profNotesPanel").innerHTML = `<div class="prof-empty">Sin asignaciones disponibles.</div>`;
        return;
    }

    panel.innerHTML = state.asignaciones.map((asig) => {
        const active = Number(asig.id) === Number(state.selectedAsignacionId) ? "active" : "";
        return `
            <button class="prof-assignment ${active}" data-asignacion-id="${escapeHTML(asig.id)}">
                <strong>${escapeHTML(asig.materia)}</strong>
                <span>${escapeHTML(asig.curso)} - Paralelo ${escapeHTML(asig.paralelo)}</span>
            </button>
        `;
    }).join("");

    panel.querySelectorAll("[data-asignacion-id]").forEach((btn) => {
        btn.addEventListener("click", () => selectAsignacion(Number(btn.dataset.asignacionId)));
    });
}

function renderTrimSelect() {
    const select = $("#profTrimSelect");
    select.disabled = !state.trimestres.length || !state.selectedAsignacionId;
    select.innerHTML = state.trimestres.map((trim) => `
        <option value="${escapeHTML(trim.id)}" ${Number(trim.id) === Number(state.selectedTrimestreId) ? "selected" : ""}>
            ${escapeHTML(trim.nombre)}
        </option>
    `).join("");
}

function setCurrentAssignment(asig) {
    $("#profCurrentTitle").textContent = asig ? asig.materia : "Seleccione una materia";
    $("#profCurrentMeta").textContent = asig ? `${asig.curso} - Paralelo ${asig.paralelo}` : "-";
}

async function selectAsignacion(asignacionId) {
    state.selectedAsignacionId = asignacionId;
    if (!state.selectedTrimestreId && state.trimestres.length) {
        state.selectedTrimestreId = state.trimestres[0].id;
    }

    const asig = state.asignaciones.find((item) => Number(item.id) === Number(asignacionId));
    setCurrentAssignment(asig);
    renderAssignments();
    renderTrimSelect();
    await loadNotas();
}

function chipClass(value) {
    if (value === null || value === undefined || value === "") return "";
    const number = Number(value);
    if (number >= 7) return "ok";
    if (number >= 5) return "warn";
    return "bad";
}

function formatNote(value) {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "-";
}

function renderNotas(data) {
    const panel = $("#profNotesPanel");
    const alumnos = data.alumnos || [];
    const tipos = data.tipos || [];
    const tipoExamen = data.tipo_examen;
    const tiposAct = tipos.filter((tipo) => tipo.codigo !== "EXAMEN");

    if (!alumnos.length) {
        panel.innerHTML = `<div class="prof-empty">No hay alumnos matriculados para esta materia.</div>`;
        return;
    }

    panel.innerHTML = `
        <div class="table-wrap">
            <table class="table">
                <thead>
                    <tr>
                        <th>Alumno</th>
                        ${tiposAct.map((tipo) => `<th>${escapeHTML(tipo.nombre)}</th>`).join("")}
                        <th>Prom. act.</th>
                        ${tipoExamen ? `<th>${escapeHTML(tipoExamen.nombre)}</th>` : ""}
                        <th>Trimestral</th>
                    </tr>
                </thead>
                <tbody>
                    ${alumnos.map((alumno) => `
                        <tr>
                            <td>
                                <strong>${escapeHTML(alumno.apellidos_est)}, ${escapeHTML(alumno.nombres_est)}</strong>
                                <br><small class="muted">${escapeHTML(alumno.cedula_est)}</small>
                            </td>
                            ${tiposAct.map((tipo) => {
                                const nota = alumno.notas?.[tipo.id]?.nota ?? "";
                                return `
                                    <td>
                                        <input class="prof-note-input" data-note-input
                                            type="number" min="0" max="10" step="0.01"
                                            value="${escapeHTML(nota)}"
                                            data-matricula-id="${escapeHTML(alumno.matricula_id)}"
                                            data-tipo-id="${escapeHTML(tipo.id)}">
                                    </td>
                                `;
                            }).join("")}
                            <td><span class="prof-chip ${chipClass(alumno.promedio_actividades)}">${formatNote(alumno.promedio_actividades)}</span></td>
                            ${tipoExamen ? `
                                <td>
                                    <input class="prof-note-input" data-note-input
                                        type="number" min="0" max="10" step="0.01"
                                        value="${escapeHTML(alumno.examen_trimestral ?? "")}"
                                        data-matricula-id="${escapeHTML(alumno.matricula_id)}"
                                        data-tipo-id="${escapeHTML(tipoExamen.id)}">
                                </td>
                            ` : ""}
                            <td><span class="prof-chip ${chipClass(alumno.nota_trimestral)}">${formatNote(alumno.nota_trimestral)}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;

    panel.querySelectorAll("[data-note-input]").forEach((input) => {
        input.addEventListener("change", handleNotaChange);
    });
}

function renderTutorCursos() {
    const panel = $("#profTutorPanel");
    if (!panel) return;

    if (!state.tutorCursos.length) {
        panel.innerHTML = `<div class="prof-empty">No tiene cursos asignados como tutor.</div>`;
        return;
    }

    panel.innerHTML = state.tutorCursos.map((curso) => `
        <div class="table-wrap" style="margin-bottom:14px;">
            <div class="prof-tools" style="border-bottom:0;">
                <div>
                    <h3>${escapeHTML(curso.curso)} - Paralelo ${escapeHTML(curso.paralelo)}</h3>
                    <p class="muted">${curso.estudiantes.length} estudiantes matriculados</p>
                </div>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Estudiante</th>
                        <th>Cedula</th>
                        <th>Representante</th>
                        <th>Telefono</th>
                    </tr>
                </thead>
                <tbody>
                    ${curso.estudiantes.length ? curso.estudiantes.map((est) => `
                        <tr>
                            <td>
                                <strong>${escapeHTML(est.apellidos_est)}, ${escapeHTML(est.nombres_est)}</strong>
                                <br><small class="muted">Matricula #${escapeHTML(est.matricula_id)}</small>
                            </td>
                            <td>${escapeHTML(est.cedula_est || "-")}</td>
                            <td>${escapeHTML(est.nombre_rep || "-")}<br><small class="muted">${escapeHTML(est.cedula_rep || "")}</small></td>
                            <td>${escapeHTML(est.telefono_rep || "-")}</td>
                        </tr>
                    `).join("") : `<tr><td colspan="4" class="prof-empty">No hay estudiantes matriculados.</td></tr>`}
                </tbody>
            </table>
        </div>
    `).join("");
}

async function loadNotas() {
    if (!state.selectedAsignacionId || !state.selectedTrimestreId) return;

    const panel = $("#profNotesPanel");
    panel.innerHTML = `<div class="prof-empty">Cargando notas...</div>`;

    try {
        const params = new URLSearchParams({
            asignacion_id: state.selectedAsignacionId,
            trimestre_id: state.selectedTrimestreId,
        });
        const data = await api(`/api/academico/notas?${params.toString()}`);
        state.notasData = data;
        renderNotas(data);
    } catch (err) {
        panel.innerHTML = `<div class="prof-empty">${escapeHTML(err.message)}</div>`;
    }
}

async function handleNotaChange(event) {
    const input = event.target;
    const value = input.value.trim();
    if (value === "") return;

    const nota = Number(value);
    if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
        showAlert("bad", "La nota debe estar entre 0 y 10.");
        input.focus();
        return;
    }

    input.disabled = true;
    try {
        await api("/api/academico/notas", {
            method: "POST",
            body: {
                matricula_id: Number(input.dataset.matriculaId),
                asignacion_id: Number(state.selectedAsignacionId),
                trimestre_id: Number(state.selectedTrimestreId),
                tipo_evaluacion_id: Number(input.dataset.tipoId),
                nota,
            },
        });
        showAlert("ok", "Nota guardada.");
        await loadNotas();
    } catch (err) {
        showAlert("bad", err.message || "No se pudo guardar la nota.");
        input.disabled = false;
    }
}

async function abrirPerfilProfesor() {
    try {
        const perfil = await api("/auth/me");
        const fotoActual = getProfilePhoto(perfil.id);
        crearModalProfesor("modalPerfilProfesor", "Mi perfil", `
            <div class="profile-photo-panel">
                <div class="avatar avatar-lg" id="perfilFotoProfesorPreview">${fotoActual ? "" : escapeHTML((perfil.nombres?.[0] || "P").toUpperCase())}</div>
                <div>
                    <strong>Foto de perfil</strong>
                    <p class="muted">Se muestra en el portal y en tu perfil de este dispositivo.</p>
                    <label class="btn-soft" style="display:inline-flex;cursor:pointer;">
                        Cambiar foto
                        <input type="file" accept="image/*" style="display:none" onchange="guardarFotoPerfilProfesor(this)">
                    </label>
                </div>
            </div>
            <div class="prof-grid" style="grid-template-columns:1fr 1fr">
                <form class="form" onsubmit="guardarPerfilProfesor(event)">
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
                <form class="form" onsubmit="guardarPasswordProfesor(event)">
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
        setAvatarElement($("#perfilFotoProfesorPreview"), perfil.nombres, fotoActual);
    } catch (err) {
        showAlert("bad", err.message || "No se pudo cargar el perfil.");
    }
}

function guardarFotoPerfilProfesor(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
        showAlert("bad", "Seleccione una imagen valida menor a 2 MB.");
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        localStorage.setItem(getProfilePhotoKey(), reader.result);
        const stored = getStoredUser();
        setAvatarElement($("#profAvatar"), stored?.nombres, reader.result);
        setAvatarElement($("#perfilFotoProfesorPreview"), stored?.nombres, reader.result);
        showAlert("ok", "Foto actualizada.");
    };
    reader.readAsDataURL(file);
}

async function guardarPerfilProfesor(event) {
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
        fillUserUI(parseJWT(getToken()), data.user);
        cerrarModalProfesor("modalPerfilProfesor");
        showAlert("ok", "Perfil actualizado.");
    } catch (err) {
        showAlert("bad", err.message || "No se pudo guardar.");
    }
}

async function guardarPasswordProfesor(event) {
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
        showAlert("ok", "Contrasena actualizada.");
    } catch (err) {
        showAlert("bad", err.message || "No se pudo cambiar la contrasena.");
    }
}

async function init() {
    applyThemeProfesor();
    const decoded = requireSession();
    if (!decoded) return;

    $("#btnLogout").addEventListener("click", logout);
    $("#btnPerfilProfesor")?.addEventListener("click", abrirPerfilProfesor);
    $("#profTrimSelect").addEventListener("change", async (event) => {
        state.selectedTrimestreId = Number(event.target.value);
        await loadNotas();
    });

    try {
        const [profile, docenteData, trimestres] = await Promise.all([
            api("/api/profesor/perfil"),
            api("/api/profesor/mi-docente"),
            api("/api/academico/trimestres"),
        ]);

        state.user = profile;
        state.docente = docenteData.docente;
        state.asignaciones = docenteData.asignaciones || [];
        state.trimestres = trimestres || [];
        state.selectedTrimestreId = state.trimestres[0]?.id || null;

        fillUserUI(decoded, profile);
        renderAssignments();
        renderTrimSelect();
        try {
            const tutorData = await api("/api/profesor/tutor-estudiantes");
            state.tutorCursos = tutorData.cursos || [];
            renderTutorCursos();
        } catch (err) {
            $("#profTutorPanel").innerHTML = `<div class="prof-empty">${escapeHTML(err.message)}</div>`;
        }

        if (state.asignaciones.length) {
            await selectAsignacion(Number(state.asignaciones[0].id));
        }
    } catch (err) {
        showAlert("bad", err.message || "No se pudo cargar el portal.");
        $("#profAssignments").innerHTML = `<div class="prof-empty">${escapeHTML(err.message)}</div>`;
    }
}

document.addEventListener("DOMContentLoaded", init);
window.cerrarModalProfesor = cerrarModalProfesor;
window.guardarPerfilProfesor = guardarPerfilProfesor;
window.guardarPasswordProfesor = guardarPasswordProfesor;
window.guardarFotoPerfilProfesor = guardarFotoPerfilProfesor;
