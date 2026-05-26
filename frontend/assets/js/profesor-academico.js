const API_BASE = window.MFC_API_BASE || "https://sistema-colegio-mfc.onrender.com";

const state = {
    user: null,
    docente: null,
    asignaciones: [],
    trimestres: [],
    selectedAsignacionId: null,
    selectedTrimestreId: null,
    notasData: null,
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
    $("#profAvatar").textContent = (nombres[0] || "P").toUpperCase();
}

function renderAssignments() {
    const panel = $("#profAssignments");

    if (!state.docente?.id) {
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

async function init() {
    const decoded = requireSession();
    if (!decoded) return;

    $("#btnLogout").addEventListener("click", logout);
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

        if (state.asignaciones.length) {
            await selectAsignacion(Number(state.asignaciones[0].id));
        }
    } catch (err) {
        showAlert("bad", err.message || "No se pudo cargar el portal.");
        $("#profAssignments").innerHTML = `<div class="prof-empty">${escapeHTML(err.message)}</div>`;
    }
}

document.addEventListener("DOMContentLoaded", init);
