const API_BASE = window.MFC_API_BASE || "https://sistema-colegio-mfc.onrender.com";
const NOTAS_ACTIVAS = false;

const state = {
    user: null,
    docente: null,
    asignaciones: [],
    trimestres: [],
    selectedAsignacionId: null,
    selectedTrimestreId: null,
    notasData: null,
    tutorCursos: [],
    periodo: null,
    periodosAcademicos: [],
    selectedAcademicPeriodoId: null,
    trimestresNuevo: [],
    academicContexts: [],
    selectedAcademicAsignacionId: null,
    selectedAcademicTrimestreId: null,
    selectedAcademicParcialId: null,
    academicMode: "materias",
    libro: null,
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
    if (!NOTAS_ACTIVAS) return;
    const panel = $("#profAssignments");
    if (!panel) return;

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
    if (!NOTAS_ACTIVAS) return;
    const select = $("#profTrimSelect");
    if (!select) return;
    select.disabled = !state.trimestres.length || !state.selectedAsignacionId;
    select.innerHTML = state.trimestres.map((trim) => `
        <option value="${escapeHTML(trim.id)}" ${Number(trim.id) === Number(state.selectedTrimestreId) ? "selected" : ""}>
            ${escapeHTML(trim.nombre)}
        </option>
    `).join("");
}

function setCurrentAssignment(asig) {
    if (!NOTAS_ACTIVAS) return;
    const title = $("#profCurrentTitle");
    const meta = $("#profCurrentMeta");
    if (!title || !meta) return;
    title.textContent = asig ? asig.materia : "Seleccione una materia";
    meta.textContent = asig ? `${asig.curso} - Paralelo ${asig.paralelo}` : "-";
}

async function selectAsignacion(asignacionId) {
    if (!NOTAS_ACTIVAS) return;
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

function tipoSlug(tipo) {
    const text = `${tipo?.codigo || ""} ${tipo?.nombre || ""}`.toLowerCase();
    if (text.includes("examen")) return "examen";
    if (text.includes("tarea")) return "tareas";
    if (text.includes("leccion") || text.includes("lección")) return "lecciones";
    if (text.includes("taller") || text.includes("trabajo grupal")) return "talleres";
    if (text.includes("aporte")) return "aportes";
    if (text.includes("individual") || text.includes("actuacion") || text.includes("actuación")) return "individual";
    return "tareas";
}

function promptNotaUnica(scope) {
    const value = prompt("Ingrese nota unica de 0 a 10:");
    if (value === null) return;
    const nota = Number(value);
    if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
        showAlert("bad", "La nota unica debe estar entre 0 y 10.");
        return;
    }

    let selector = "[data-note-input]";
    if (scope === "parcial") selector = "[data-note-input][data-scope='parcial']";
    if (scope === "examen") selector = "[data-note-input][data-scope='examen']";

    document.querySelectorAll(selector).forEach(input => {
        input.value = nota;
        input.dispatchEvent(new Event("change", { bubbles: true }));
    });
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
        <div class="prof-summary">
            <div class="prof-stat"><span>Estudiantes</span><strong>${alumnos.length}</strong></div>
            <div class="prof-stat"><span>Parcial actual</span><strong>1</strong></div>
            <div class="prof-stat"><span>Insumos</span><strong>${tiposAct.length}</strong></div>
            <div class="prof-stat"><span>Examen</span><strong>${tipoExamen ? "SI" : "NO"}</strong></div>
        </div>
        <div class="prof-subbar">
            <button class="prof-mini-btn" type="button" onclick="promptNotaUnica('parcial')">Nota unica parcial</button>
            ${tipoExamen ? `<button class="prof-mini-btn" type="button" onclick="promptNotaUnica('examen')">Nota unica examen</button>` : ""}
            <button class="prof-mini-btn" type="button" onclick="promptNotaUnica('todo')">Nota unica todo</button>
        </div>
        <div class="table-wrap">
            <table class="table prof-grade-table">
                <thead>
                    <tr>
                        <th>Alumno</th>
                        ${tiposAct.map((tipo) => `<th><span class="prof-insumo ${tipoSlug(tipo)}">${escapeHTML(tipo.nombre)}</span></th>`).join("")}
                        <th>Prom. act.</th>
                        ${tipoExamen ? `<th><span class="prof-insumo examen">${escapeHTML(tipoExamen.nombre)}</span></th>` : ""}
                        <th>Trimestral</th>
                    </tr>
                </thead>
                <tbody>
                    ${alumnos.map((alumno) => `
                        <tr>
                            <td class="prof-student-cell">
                                <strong>${escapeHTML(alumno.apellidos_est)}, ${escapeHTML(alumno.nombres_est)}</strong>
                                <br><small class="muted">${escapeHTML(alumno.cedula_est)}</small>
                            </td>
                            ${tiposAct.map((tipo) => {
                                const nota = alumno.notas?.[tipo.id]?.nota ?? "";
                                const slug = tipoSlug(tipo);
                                return `
                                    <td>
                                        <input class="prof-note-input insumo-${slug}" data-note-input data-scope="parcial"
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
                                    <input class="prof-note-input insumo-examen" data-note-input data-scope="examen"
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

function buildAsistenciaTutorHTML() {
    if (!state.tutorCursos.length) {
        return `<div class="prof-empty">No tiene cursos asignados como tutor.</div>`;
    }

    const today = new Date().toISOString().slice(0, 10);
    const curso = state.tutorCursos[0];
    const estudiantes = curso.estudiantes || [];

    return `
        <div class="card" style="padding:14px">
            <h3 style="margin:0 0 10px;text-align:center">CONTROL DE ASISTENCIA</h3>
            <div class="prof-grid" style="grid-template-columns:repeat(3,minmax(180px,1fr));gap:10px">
                <div class="form-group">
                    <label>Curso</label>
                    <select id="attCursoSel">
                        ${state.tutorCursos.map(c => `<option value="${escapeHTML(c.curso_id)}">${escapeHTML(c.curso)}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group">
                    <label>Especialidad</label>
                    <input value="GENERAL" disabled>
                </div>
                <div class="form-group">
                    <label>Paralelo</label>
                    <select id="attParaleloSel">
                        ${state.tutorCursos.map(c => `<option value="${escapeHTML(c.paralelo_id)}">${escapeHTML(c.paralelo)}</option>`).join("")}
                    </select>
                </div>
                <div class="form-group">
                    <label>Materia</label>
                    <input value="TUTORÍA" disabled>
                </div>
                <div class="form-group">
                    <label>Parcial</label>
                    <select id="attParcialSel"><option>Primero</option><option>Segundo</option><option>Tercero</option></select>
                </div>
                <div class="form-group">
                    <label>Trimestre</label>
                    <select id="attTrimestreSel"><option>Primero</option><option>Segundo</option><option>Tercero</option></select>
                </div>
            </div>
        </div>
        <div class="card" style="padding:14px;margin-top:12px" data-curso-id="${escapeHTML(curso.curso_id)}" data-paralelo-id="${escapeHTML(curso.paralelo_id)}">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
                <button class="prof-mini-btn" type="button">Nómina</button>
                <button class="prof-mini-btn" type="button">Porcentaje Asistencia</button>
                <button class="prof-mini-btn" type="button">Control de Faltas</button>
                <button class="prof-mini-btn" type="button">Control de Atrasos</button>
            </div>
            <div class="prof-grid" style="grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px;margin-bottom:10px">
                <div class="form-group"><label>Fecha</label><input id="attFecha" type="date" value="${today}"></div>
                <div class="form-group"><label>Carga Horaria</label><input id="attCarga" type="number" min="0" step="1" value="1"></div>
                <div class="form-group"><label>Días Laborables</label><input id="attDias" type="number" min="0" step="1" value="35"></div>
                <div class="form-group"><label>N° Horas Diarias</label><input id="attHoras" type="number" min="0" step="1" value="1"></div>
            </div>
            <div class="table-wrap">
                <table class="table">
                    <thead>
                        <tr>
                            <th>N°</th>
                            <th>Estudiante</th>
                            <th>Atrasos</th>
                            <th>Inasistencia</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${estudiantes.length ? estudiantes.map((est, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${escapeHTML(est.apellidos_est)}, ${escapeHTML(est.nombres_est)}</td>
                                <td style="text-align:center">
                                    <input type="checkbox" onchange="guardarAsistenciaCheck(${Number(curso.curso_id)},${Number(curso.paralelo_id)},${Number(est.matricula_id)},'ATRASO',this)">
                                </td>
                                <td style="text-align:center">
                                    <input type="checkbox" onchange="guardarAsistenciaCheck(${Number(curso.curso_id)},${Number(curso.paralelo_id)},${Number(est.matricula_id)},'AUSENTE',this)">
                                </td>
                            </tr>
                        `).join("") : `<tr><td colspan="4" class="muted">No hay estudiantes matriculados.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAsistenciaResumenUI() {
    const tbody = document.getElementById("attTableBody");
    const kPresentes = document.getElementById("attKpiPresentes");
    const kAusentes = document.getElementById("attKpiAusentes");
    const kTotal = document.getElementById("attKpiTotal");
    const kFecha = document.getElementById("attKpiFecha");

    const rows = [];
    const today = new Date().toISOString().slice(0, 10);

    state.tutorCursos.forEach(curso => {
        (curso.estudiantes || []).forEach((est, idx) => {
            const estado = idx % 3 === 0 ? "AUSENTE" : "PRESENTE";
            rows.push({
                fecha: today,
                estado,
                icono: estado === "PRESENTE" ? "✅" : "❌",
            });
        });
    });

    if (tbody) {
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="3" class="muted">Sin registros de asistencia por ahora.</td></tr>`;
        } else {
            tbody.innerHTML = rows.slice(0, 30).map((r) => `
                <tr>
                    <td>${escapeHTML(r.fecha)}</td>
                    <td>
                        <span class="att-status ${r.estado === "PRESENTE" ? "presente" : "ausente"}">
                            ${r.estado === "PRESENTE" ? "Presente" : "Ausente"}
                        </span>
                    </td>
                    <td><span class="att-icon">${r.icono}</span></td>
                </tr>
            `).join("");
        }
    }

    const presentes = rows.filter(r => r.estado === "PRESENTE").length;
    const ausentes = rows.filter(r => r.estado === "AUSENTE").length;
    const total = rows.length;

    if (kPresentes) kPresentes.textContent = String(presentes);
    if (kAusentes) kAusentes.textContent = String(ausentes);
    if (kTotal) kTotal.textContent = String(total);
    if (kFecha) kFecha.textContent = total ? today : "—";

    const canvas = document.getElementById("attResumenChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width = canvas.clientWidth || 420;
    const h = canvas.height = 130;
    ctx.clearRect(0, 0, w, h);

    const max = Math.max(presentes, ausentes, 1);
    const baseY = h - 20;
    const barW = 90;
    const gap = 60;
    const startX = (w - (barW * 2 + gap)) / 2;

    const bars = [
        { label: "Presentes", value: presentes, color: "#10b981" },
        { label: "Ausentes", value: ausentes, color: "#ef4444" },
    ];

    bars.forEach((b, i) => {
        const x = startX + i * (barW + gap);
        const bh = Math.max(8, (b.value / max) * 70);
        const y = baseY - bh;
        ctx.fillStyle = b.color;
        ctx.fillRect(x, y, barW, bh);
        ctx.fillStyle = "#64748b";
        ctx.font = "12px Segoe UI";
        ctx.fillText(b.label, x, baseY + 14);
        ctx.fillText(String(b.value), x + barW / 2 - 4, y - 6);
    });
}

function renderTutorCursos() {
    const panel = $("#profTutorPanel");
    if (panel) {
        panel.innerHTML = buildAsistenciaTutorHTML();
    }
    const asistenciaPanel = document.getElementById("profAsistenciaTutorPanel");
    if (asistenciaPanel) {
        asistenciaPanel.innerHTML = buildAsistenciaTutorHTML();
    }
    renderAsistenciaResumenUI();
}

async function marcarAsistenciaLocal(matriculaId, estado, btn) {
    const card = btn.closest(".prof-student-card");
    const container = btn.closest("[data-curso-id]");
    const cursoId = container?.dataset?.cursoId;
    const paraleloId = container?.dataset?.paraleloId;
    const fecha = new Date().toISOString().slice(0, 10);

    if (!cursoId || !paraleloId) {
        showAlert("bad", "No se pudo identificar curso/paralelo para asistencia.");
        return;
    }

    btn.disabled = true;
    try {
        await api("/api/profesor/asistencia", {
            method: "POST",
            body: {
                curso_id: Number(cursoId),
                paralelo_id: Number(paraleloId),
                fecha,
                registros: [
                    {
                        matricula_id: Number(matriculaId),
                        estado: String(estado || "").toUpperCase(),
                    }
                ],
            },
        });

        btn.parentElement.querySelectorAll("button").forEach(item => item.classList.remove("active"));
        btn.classList.add("active");
        if (card) {
            card.dataset.asistenciaEstado = estado;
        }
        showAlert("ok", `Asistencia guardada: ${estado}`);
    } catch (err) {
        showAlert("bad", err.message || "No se pudo guardar asistencia.");
    } finally {
        btn.disabled = false;
    }
}

function renderProfesorCardsMenu() {
    const tabsWrap = document.querySelector(".prof-tabs");
    if (!tabsWrap) return;

    tabsWrap.innerHTML = `
        <button class="prof-assignment active" data-prof-section="materias">
            <strong>📘 Insumos</strong>
            <span>Tareas, evaluación individual, taller grupal y examen</span>
        </button>
        <button class="prof-assignment" data-prof-section="asistencia">
            <strong>🗓️ Asistencia</strong>
            <span>Control diario del curso</span>
        </button>
        <button class="prof-assignment" data-prof-section="documentacion">
            <strong>📂 Documentación</strong>
            <span>Guías y procesos académicos</span>
        </button>
        <button class="prof-assignment" data-prof-section="mensajes">
            <strong>💬 Mensajes</strong>
            <span>Comunicaciones y avisos</span>
        </button>
    `;
}

function setupProfesorTabs() {
    renderProfesorCardsMenu();
    const tabsWrap = document.querySelector(".prof-tabs");
    if (tabsWrap) {
        tabsWrap.innerHTML = `
            <button class="prof-assignment active" data-prof-section="materias">
                <strong>Materias</strong>
                <span>Selecciona una materia antes de gestionar notas</span>
            </button>
            <button class="prof-assignment" data-prof-section="asistencia">
                <strong>Asistencia</strong>
                <span>Control diario del curso</span>
            </button>
            <button class="prof-assignment" data-prof-section="documentacion">
                <strong>Documentacion</strong>
                <span>Guias y procesos academicos</span>
            </button>
            <button class="prof-assignment" data-prof-section="mensajes">
                <strong>Mensajes</strong>
                <span>Comunicaciones y avisos</span>
            </button>
        `;
    }
    document.querySelectorAll("[data-prof-section]").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("[data-prof-section]").forEach(item => item.classList.remove("active"));
            btn.classList.add("active");
            const section = btn.dataset.profSection;
            if (section === "materias") {
                state.academicMode = "materias";
                state.selectedAcademicAsignacionId = null;
                state.selectedAcademicParcialId = null;
                state.libro = null;
                renderAcademicShell();
            }
            const secInsumos = document.getElementById("profSectionInsumos");
            if (secInsumos) secInsumos.hidden = section !== "materias";
            const secAsistencia = document.getElementById("profSectionAsistencia");
            if (secAsistencia) secAsistencia.hidden = section !== "asistencia";
            const secDocumentacion = document.getElementById("profSectionDocumentacion");
            if (secDocumentacion) secDocumentacion.hidden = section !== "documentacion";
            const secMsg = document.getElementById("profSectionMensajes");
            if (secMsg) secMsg.hidden = section !== "mensajes";
            const secNotas = document.getElementById("profSectionNotas");
            if (secNotas) secNotas.hidden = true;
            const secTutorias = document.getElementById("profSectionTutorias");
            if (secTutorias) secTutorias.hidden = true;
        });
    });
}

function injectAcademicProfesorStyles() {
    if (document.getElementById("prof-academic-new-styles")) return;
    const style = document.createElement("style");
    style.id = "prof-academic-new-styles";
    style.textContent = `
        .academic-shell { padding: 14px; display: grid; gap: 14px; }
        .materias-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; padding:14px; }
        .materia-card { border:1px solid var(--stroke); border-radius:16px; background:var(--panel2); padding:14px; display:grid; gap:10px; min-height:190px; }
        .materia-card h4 { margin:0; font-size:17px; line-height:1.2; }
        .materia-card-meta { display:grid; gap:6px; color:var(--muted); font-size:13px; }
        .materia-card-kpi { display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px solid var(--stroke); border-radius:12px; padding:9px 10px; background:var(--panel); }
        .materia-card-kpi strong { color:var(--blue); font-size:18px; }
        .materia-card-actions { margin-top:auto; }
        .materia-header { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:flex-start; padding:14px; border-bottom:1px solid var(--stroke); background:var(--panel2); }
        .materia-header h3 { margin:0; font-size:20px; }
        .materia-options { display:flex; gap:8px; flex-wrap:wrap; }
        .materia-option { border:1px solid var(--stroke); border-radius:999px; padding:8px 10px; background:var(--panel); color:var(--txt); font-weight:800; font-size:12px; }
        .academic-filters { display:grid; grid-template-columns: 1.2fr .7fr auto; gap:10px; align-items:end; }
        .academic-filters label { display:block; font-size:12px; font-weight:800; color:var(--muted); margin-bottom:5px; }
        .academic-filters select { width:100%; }
        .academic-board { display:grid; grid-template-columns: 300px minmax(0,1fr); gap:14px; align-items:start; }
        .partial-list, .partial-detail { border:1px solid var(--stroke); border-radius:16px; background:var(--panel2); overflow:hidden; }
        .partial-list-head, .partial-detail-head { padding:12px; border-bottom:1px solid var(--stroke); display:flex; justify-content:space-between; gap:8px; align-items:center; }
        .partial-list-body { padding:10px; display:grid; gap:8px; }
        .partial-btn { border:1px solid var(--stroke); background:var(--panel); color:var(--txt); border-radius:12px; padding:10px; text-align:left; cursor:pointer; }
        .partial-btn.active { border-color:var(--blue); box-shadow:0 0 0 2px rgba(37,99,235,.10); }
        .partial-status { display:inline-flex; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:900; background:rgba(16,185,129,.12); color:#065f46; }
        .partial-status.closed { background:rgba(239,68,68,.12); color:#991b1b; }
        .insumo-toolbar { display:flex; flex-wrap:wrap; gap:8px; padding:12px; border-bottom:1px solid var(--stroke); }
        .insumo-btn { border:1px solid var(--stroke); background:var(--panel); color:var(--txt); border-radius:999px; padding:8px 10px; font-weight:800; cursor:pointer; }
        .insumo-btn.tarea { border-color:#93c5fd; }
        .insumo-btn.leccion { border-color:#fcd34d; }
        .insumo-btn.taller { border-color:#6ee7b7; }
        .insumo-btn.aporte { border-color:#c4b5fd; }
        .insumo-btn.individual { border-color:#67e8f9; }
        .grade-table-wrap { overflow:auto; background:var(--panel); }
        .grade-table { width:100%; border-collapse:collapse; min-width:920px; font-size:13px; }
        .grade-table th, .grade-table td { padding:9px 10px; border-bottom:1px solid var(--stroke); text-align:left; }
        .grade-table th { font-size:11px; text-transform:uppercase; color:var(--muted); background:var(--panel2); }
        .grade-table th:first-child, .grade-table td:first-child { position:sticky; left:0; background:var(--panel); z-index:1; min-width:220px; }
        .grade-input { width:68px; border:1px solid var(--stroke); border-radius:10px; padding:7px; text-align:center; font-weight:800; background:var(--panel2); color:var(--txt); }
        .grade-input.examen { border-color:#fca5a5; background:rgba(239,68,68,.08); }
        .calc-chip { display:inline-flex; min-width:46px; justify-content:center; border-radius:9px; padding:5px 8px; background:var(--panel2); font-weight:900; }
        .calc-chip.ok { background:rgba(16,185,129,.12); color:#065f46; }
        .calc-chip.warn { background:rgba(245,158,11,.14); color:#92400e; }
        .calc-chip.bad { background:rgba(239,68,68,.12); color:#991b1b; }
        .academic-empty { padding:28px; text-align:center; color:var(--muted); }
        @media (max-width: 900px) {
            .academic-filters, .academic-board { grid-template-columns:1fr; }
            .grade-table th:first-child, .grade-table td:first-child { position:static; }
        }
    `;
    document.head.appendChild(style);
}

function chipForNota(value) {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    if (n >= 7) return "ok";
    if (n >= 5) return "warn";
    return "bad";
}

function notaTxt(value) {
    if (value === null || value === undefined || value === "") return "-";
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
}

function tipoLabel(tipo) {
    return {
        TAREA: "Tareas",
        LECCION: "Lecciones",
        TALLER: "Talleres",
        APORTE: "Aportes",
        INDIVIDUAL: "Individual",
    }[tipo] || tipo;
}

function tipoClass(tipo) {
    return String(tipo || "").toLowerCase();
}

function renderMateriasDocente(materias) {
    if (!materias.length) {
        return `<div class="academic-empty">No tienes materias asignadas todavia.</div>`;
    }

    return `
        <div class="materias-grid">
            ${materias.map(materia => `
                <article class="materia-card">
                    <div>
                        <h4>${escapeHTML(materia.materia_nombre || materia.materia || "-")}</h4>
                        <div class="materia-card-meta">
                            <span>${escapeHTML(materia.curso_nombre || materia.curso || "-")} - Paralelo ${escapeHTML(materia.paralelo || "-")}</span>
                            <span>Periodo: ${escapeHTML(materia.periodo_nombre || state.periodo?.nombre || "-")}</span>
                            ${materia.docente_nombres ? `<span>Docente: ${escapeHTML(`${materia.docente_nombres} ${materia.docente_apellidos || ""}`.trim())}</span>` : ""}
                        </div>
                    </div>
                    <div class="materia-card-kpi">
                        <span>Estudiantes</span>
                        <strong>${escapeHTML(materia.total_estudiantes ?? "-")}</strong>
                    </div>
                    <div class="materia-card-actions">
                        <button class="btn" type="button" onclick="seleccionarMateria(${Number(materia.asignacion_id || materia.id)})">Gestionar materia</button>
                    </div>
                </article>
            `).join("")}
        </div>
    `;
}

async function cargarMateriasDocente() {
    const materias = await api("/api/profesor/materias");
    if (state.selectedAcademicPeriodoId) {
        state.academicContexts = materias.filter(item => Number(item.periodo_id) === Number(state.selectedAcademicPeriodoId));
    } else {
        state.academicContexts = materias;
    }
    state.academicMode = "materias";
    state.selectedAcademicAsignacionId = null;
    state.selectedAcademicParcialId = null;
    state.libro = null;
    renderAcademicShell();
}

async function seleccionarMateria(asignacionId) {
    const materia = state.academicContexts.find(item => Number(item.asignacion_id || item.id) === Number(asignacionId));
    if (!materia) {
        showAlert("bad", "Materia no encontrada o no asignada.");
        return;
    }
    state.selectedAcademicAsignacionId = Number(materia.asignacion_id || materia.id);
    state.academicMode = "gestion";
    state.selectedAcademicParcialId = null;
    await loadAcademicBook();
}

function volverMateriasDocente() {
    state.academicMode = "materias";
    state.selectedAcademicAsignacionId = null;
    state.selectedAcademicParcialId = null;
    state.libro = null;
    renderAcademicShell();
}

function renderPanelMateriaSeleccionada() {
    renderAcademicShell();
}

async function cargarInsumosPorMateria() {
    await loadAcademicBook();
}

async function cargarNotasPorMateria() {
    await loadAcademicBook();
}

async function cargarExamenPorMateria() {
    await loadAcademicBook();
}

function renderAcademicShell() {
    const section = document.getElementById("profSectionInsumos");
    if (!section) return;
    const selectedAsignacion = state.academicContexts.find(item => Number(item.asignacion_id || item.id) === Number(state.selectedAcademicAsignacionId));
    if (state.academicMode === "materias" || !selectedAsignacion) {
        section.innerHTML = `
            <div class="card-head">
                <h3>Materias</h3>
            </div>
            ${renderMateriasDocente(state.academicContexts)}
        `;
        return;
    }

    section.innerHTML = `
        <div class="card-head">
            <h3>Gestion academica de materia</h3>
            <button class="btn-soft" type="button" onclick="volverMateriasDocente()">Volver a materias</button>
        </div>
        <div class="academic-shell">
            <div class="materia-header">
                <div>
                    <h3>Materia: ${escapeHTML(selectedAsignacion?.materia_nombre || selectedAsignacion?.materia || "-")}</h3>
                    <p class="muted" style="margin:4px 0 0;">Curso: ${escapeHTML(selectedAsignacion?.curso_nombre || selectedAsignacion?.curso || "-")} - Paralelo ${escapeHTML(selectedAsignacion?.paralelo || "-")}</p>
                    <p class="muted" style="margin:4px 0 0;">Periodo: ${escapeHTML((state.periodosAcademicos.find(p => Number(p.id) === Number(state.selectedAcademicPeriodoId))?.nombre) || selectedAsignacion?.periodo_nombre || state.periodo?.nombre || "-")}</p>
                </div>
                <div class="materia-options">
                    <span class="materia-option">Insumos</span>
                    <span class="materia-option">Parciales</span>
                    <span class="materia-option">Examen trimestral</span>
                    <span class="materia-option">Promedios</span>
                    <span class="materia-option">Asistencia</span>
                </div>
            </div>
            <div class="academic-filters" style="grid-template-columns:1fr 1fr;">
                <div>
                    <label>Año lectivo</label>
                    <select id="academicPeriodoSelect">
                        ${state.periodosAcademicos.map(periodo => `
                            <option value="${escapeHTML(periodo.id)}" ${Number(periodo.id) === Number(state.selectedAcademicPeriodoId) ? "selected" : ""}>
                                ${escapeHTML(periodo.nombre)}
                            </option>
                        `).join("")}
                    </select>
                </div>
                <div>
                    <label>Trimestre</label>
                    <select id="academicTrimestreSelect">
                        ${state.trimestresNuevo.map(trim => `
                            <option value="${escapeHTML(trim.id)}" ${Number(trim.id) === Number(state.selectedAcademicTrimestreId) ? "selected" : ""}>
                                ${escapeHTML(trim.nombre)}
                            </option>
                        `).join("")}
                    </select>
                </div>
            </div>
            <div class="prof-summary">
                <div class="prof-stat"><span>Periodo</span><strong>${escapeHTML((state.periodosAcademicos.find(p => Number(p.id) === Number(state.selectedAcademicPeriodoId))?.nombre) || state.periodo?.nombre || "-")}</strong></div>
                <div class="prof-stat"><span>Estudiantes</span><strong>${escapeHTML(selectedAsignacion?.total_estudiantes ?? state.libro?.alumnos?.length ?? 0)}</strong></div>
                <div class="prof-stat"><span>Parciales</span><strong>${state.libro?.parciales?.length || 0}</strong></div>
                <div class="prof-stat"><span>Formula</span><strong>70/30</strong></div>
            </div>
            <div id="academicBookPanel">${renderAcademicBook()}</div>
        </div>
    `;

    document.getElementById("academicPeriodoSelect")?.addEventListener("change", async (event) => {
        state.selectedAcademicPeriodoId = Number(event.target.value);
        state.selectedAcademicParcialId = null;
        await cargarMateriasDocente();
    });

    document.getElementById("academicTrimestreSelect")?.addEventListener("change", async (event) => {
        state.selectedAcademicTrimestreId = Number(event.target.value);
        state.selectedAcademicParcialId = null;
        await loadAcademicBook();
    });
}

function renderAcademicBook() {
    const libro = state.libro;
    if (!state.academicContexts.length) {
        return `<div class="academic-empty">No hay materias asignadas todavia.</div>`;
    }
    if (!libro) {
        return `<div class="academic-empty">Seleccione materia y trimestre para cargar el libro.</div>`;
    }

    const isSetupRequired = Boolean(libro?.setup_required);
    const fallbackParciales = [
        { id: -1, nombre: "PARCIAL 1", orden: 1, estado: "ABIERTO", insumos: [] },
        { id: -2, nombre: "PARCIAL 2", orden: 2, estado: "ABIERTO", insumos: [] },
    ];
    const parciales = isSetupRequired ? fallbackParciales : (libro.parciales || []);
    const active = parciales.find(p => Number(p.id) === Number(state.selectedAcademicParcialId)) || parciales[0] || null;

    if (active && !state.selectedAcademicParcialId) {
        state.selectedAcademicParcialId = active.id;
    }

    return `
        <div class="card" style="padding:12px">
            <strong>Parciales:</strong>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
                ${parciales.length ? parciales.map((parcial) => `
                    <div style="display:flex;align-items:center;gap:4px">
                        <button class="partial-btn ${Number(parcial.id) === Number(active?.id) ? "active" : ""}" type="button" onclick="seleccionarParcial(${Number(parcial.id)})">
                            <strong>${escapeHTML(parcial.nombre)}</strong>
                        </button>
                        ${!isSetupRequired && Number(parcial.orden) >= 3 ? `<button class="btn-soft" type="button" title="Eliminar parcial" onclick="profEliminarParcial(${Number(parcial.id)}, '${escapeHTML(parcial.nombre)}')">🗑</button>` : ""}
                    </div>
                `).join("") : `<div class="academic-empty">Cree el primer parcial para agregar insumos.</div>`}
                <button class="prof-mini-btn" type="button" onclick="${isSetupRequired ? "showAlert('bad','Modo visual: primero ejecuta database/academico-parciales-insumos.sql en Railway para guardar cambios reales.')" : "profCrearParcial()"}">+</button>
            </div>
            <div class="muted" style="margin-top:6px;font-size:12px">PARCIAL 1 y PARCIAL 2 son obligatorios y no se pueden eliminar.</div>
            ${isSetupRequired ? `<div class="muted" style="margin-top:6px;font-size:12px;color:#b45309">Modo visual activo: se muestra lista base de parciales, pero no guarda hasta ejecutar SQL de estructura nueva.</div>` : ""}
        </div>
        <div class="academic-board">
            <section class="partial-detail" id="partialDetailPanel">
                ${isSetupRequired
                    ? `<div class="academic-empty">${escapeHTML(libro.error)}<br><small>Ejecute database/academico-parciales-insumos.sql en Railway.</small></div>`
                    : (active ? renderParcialDetail(active) : "")
                }
            </section>
        </div>
    `;
}

function seleccionarParcial(parcialId) {
    state.selectedAcademicParcialId = Number(parcialId);
    renderAcademicShell();
}

function renderParcialDetail(parcial) {
    const alumnos = state.libro?.alumnos || [];
    const selectedAsignacion = state.academicContexts.find(item => Number(item.asignacion_id || item.id) === Number(state.selectedAcademicAsignacionId));

    return `
        <div style="padding:12px;border-bottom:1px solid var(--stroke);background:var(--panel)">
            <h3 style="margin:0 0 8px;text-align:center">INSUMOS</h3>
            <div class="prof-grid" style="grid-template-columns:repeat(3,minmax(180px,1fr));gap:10px">
                <div class="form-group"><label>Curso</label><input value="${escapeHTML(selectedAsignacion?.curso || '-')}" disabled></div>
                <div class="form-group"><label>Especialidad</label><input value="GENERAL" disabled></div>
                <div class="form-group"><label>Paralelo</label><input value="${escapeHTML(selectedAsignacion?.paralelo || '-')}" disabled></div>
                <div class="form-group"><label>Asignatura</label><input value="${escapeHTML(selectedAsignacion?.materia || '-')}" disabled></div>
                <div class="form-group"><label>Parcial</label><input value="${escapeHTML(parcial.nombre)}" disabled></div>
                <div class="form-group"><label>Trimestre</label><input value="${escapeHTML((state.trimestresNuevo.find(t => Number(t.id) === Number(state.selectedAcademicTrimestreId))?.nombre) || '-')}" disabled></div>
            </div>
        </div>
        <div class="partial-detail-head">
            <div>
                <strong>${escapeHTML(parcial.nombre)}</strong>
                <span class="partial-status ${parcial.estado === "CERRADO" ? "closed" : ""}">${escapeHTML(parcial.estado)}</span>
            </div>
            <div class="actions-inline">
                <button class="prof-mini-btn" type="button" onclick="profNotaUnicaParcial(${parcial.id})">Nota unica parcial</button>
                <button class="prof-mini-btn" type="button" onclick="profNotaUnicaExamen()">Nota unica examen</button>
                <button class="prof-mini-btn" type="button" onclick="profCambiarEstadoParcial(${parcial.id}, '${parcial.estado === "CERRADO" ? "ABIERTO" : "CERRADO"}')">${parcial.estado === "CERRADO" ? "Reabrir" : "Cerrar"}</button>
            </div>
        </div>
        <div class="insumo-toolbar">
            ${["TAREA","LECCION","TALLER","APORTE","INDIVIDUAL"].map(tipo => `
                <button class="insumo-btn ${tipoClass(tipo)}" type="button" onclick="profCrearInsumo(${parcial.id}, '${tipo}')">+ ${tipoLabel(tipo)}</button>
            `).join("")}
        </div>
        <div class="grade-table-wrap">
            <table class="grade-table">
                <thead>
                    <tr>
                        <th>N°</th>
                        <th>Estudiante</th>
                        ${parcial.insumos.map(insumo => `<th>${escapeHTML(insumo.nombre)}<br><small>${tipoLabel(insumo.tipo)}</small></th>`).join("")}
                        <th>Calificación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${alumnos.map((alumno, idx) => {
                        const parcialAlumno = (alumno.parciales || []).find(p => Number(p.parcial_id) === Number(parcial.id));
                        return `
                            <tr>
                                <td>${idx + 1}</td>
                                <td><strong>${escapeHTML(alumno.apellidos_est)}, ${escapeHTML(alumno.nombres_est)}</strong></td>
                                ${parcial.insumos.map(insumo => {
                                    const nota = insumo.notas?.[String(alumno.matricula_id)]?.nota ?? "";
                                    return `<td><input class="grade-input" type="number" min="0" max="10" step="0.01" value="${escapeHTML(nota)}" onchange="profGuardarNotaInsumo(${insumo.id}, ${alumno.matricula_id}, this.value, this)"></td>`;
                                }).join("")}
                                <td><span class="calc-chip ${chipForNota(parcialAlumno?.promedio)}">${notaTxt(parcialAlumno?.promedio)}</span></td>
                                <td><button class="prof-mini-btn" type="button" onclick="profEditarFila(${alumno.matricula_id})">✎</button></td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

async function loadAcademicContext() {
    injectAcademicProfesorStyles();
    const shell = document.getElementById("profSectionInsumos");
    if (shell) {
        shell.innerHTML = `<div class="card-head"><h3>Insumos y parciales</h3></div><div class="prof-empty">Cargando contexto academico...</div>`;
    }
    try {
        const [periodo, periodos, trimestres] = await Promise.all([
            api("/api/academico/periodo-activo"),
            api("/api/academico/periodos"),
            api("/api/academico/trimestres"),
        ]);
        state.periodo = periodo;
        state.periodosAcademicos = periodos || [];
        state.selectedAcademicPeriodoId = periodo?.id || state.periodosAcademicos[0]?.id || null;
        state.trimestresNuevo = trimestres || [];
        state.selectedAcademicTrimestreId = state.trimestresNuevo[0]?.id || null;
        await cargarMateriasDocente();
    } catch (err) {
        if (shell) shell.innerHTML = `<div class="card-head"><h3>Materias</h3></div><div class="prof-empty">${escapeHTML(err.message)}</div>`;
    }
}

async function loadAcademicBook() {
    if (!state.selectedAcademicAsignacionId || !state.selectedAcademicTrimestreId) {
        state.libro = null;
        renderAcademicShell();
        return;
    }
    try {
        state.libro = await api(`/api/academico/libro?asignacion_id=${state.selectedAcademicAsignacionId}&trimestre_id=${state.selectedAcademicTrimestreId}`);
        if (!state.libro?.setup_required) {
            await asegurarParcialesBase();
            state.libro = await api(`/api/academico/libro?asignacion_id=${state.selectedAcademicAsignacionId}&trimestre_id=${state.selectedAcademicTrimestreId}`);
        }
    } catch (err) {
        state.libro = { setup_required: true, error: err.message };
    }
    renderAcademicShell();
}

async function asegurarParcialesBase() {
    const parciales = state.libro?.parciales || [];
    if (parciales.length >= 2) return;

    const existentes = new Set(
        parciales.map(p => String(p.nombre || "").trim().toUpperCase())
    );

    const base = ["PARCIAL 1", "PARCIAL 2"];
    for (const nombre of base) {
        if (existentes.has(nombre)) continue;
        await api("/api/academico/parciales", {
            method: "POST",
            body: {
                asignacion_id: state.selectedAcademicAsignacionId,
                trimestre_id: state.selectedAcademicTrimestreId,
                nombre,
            },
        });
    }
}

async function profCrearParcial() {
    const nombre = prompt("Nombre del parcial adicional:", "");
    if (nombre === null) return;
    try {
        await api("/api/academico/parciales", {
            method: "POST",
            body: {
                asignacion_id: state.selectedAcademicAsignacionId,
                trimestre_id: state.selectedAcademicTrimestreId,
                nombre: nombre.trim() || undefined,
            },
        });
        await loadAcademicBook();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function profCrearInsumo(parcialId, tipo) {
    const nombre = prompt(`Nombre de ${tipoLabel(tipo)}:`, "");
    if (nombre === null) return;
    try {
        await api("/api/academico/insumos", {
            method: "POST",
            body: { parcial_id: parcialId, tipo, nombre: nombre.trim() || undefined },
        });
        await loadAcademicBook();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function profGuardarNotaInsumo(insumoId, matriculaId, nota, input) {
    if (nota === "") return;
    input.disabled = true;
    try {
        await api("/api/academico/notas-insumo", {
            method: "POST",
            body: { insumo_id: insumoId, matricula_id: matriculaId, nota },
        });
        await loadAcademicBook();
    } catch (err) {
        showAlert("bad", err.message);
        input.disabled = false;
    }
}

async function profGuardarExamen(matriculaId, nota, input) {
    if (nota === "") return;
    input.disabled = true;
    try {
        await api("/api/academico/examen-trimestral", {
            method: "POST",
            body: {
                asignacion_id: state.selectedAcademicAsignacionId,
                trimestre_id: state.selectedAcademicTrimestreId,
                matricula_id: matriculaId,
                nota,
            },
        });
        await loadAcademicBook();
    } catch (err) {
        showAlert("bad", err.message);
        input.disabled = false;
    }
}

async function profCambiarEstadoParcial(parcialId, estado) {
    try {
        await api(`/api/academico/parciales/${parcialId}/estado`, {
            method: "PATCH",
            body: { estado },
        });
        await loadAcademicBook();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function profNotaUnicaParcial(parcialId) {
    const nota = prompt("Nota unica para todos los insumos de este parcial:");
    if (nota === null) return;
    try {
        await api("/api/academico/nota-unica", {
            method: "POST",
            body: { parcial_id: parcialId, nota },
        });
        await loadAcademicBook();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function profNotaUnicaExamen() {
    const nota = prompt("Nota unica para el examen trimestral:");
    if (nota === null) return;
    try {
        await api("/api/academico/nota-unica", {
            method: "POST",
            body: {
                asignacion_id: state.selectedAcademicAsignacionId,
                trimestre_id: state.selectedAcademicTrimestreId,
                alcance: "EXAMEN",
                nota,
            },
        });
        await loadAcademicBook();
    } catch (err) {
        showAlert("bad", err.message);
    }
}

async function loadNotas() {
    if (!NOTAS_ACTIVAS) return;
    if (!state.selectedAsignacionId || !state.selectedTrimestreId) return;

    const panel = $("#profNotesPanel");
    if (!panel) return;
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
    if (!NOTAS_ACTIVAS) return;
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
    setupProfesorTabs();
    $("#btnPerfilProfesor")?.addEventListener("click", abrirPerfilProfesor);

    const btnVolverAdmin = $("#btnVolverAdmin");
    if (decoded.rol === "ADMIN" && btnVolverAdmin) {
        btnVolverAdmin.hidden = false;
        btnVolverAdmin.addEventListener("click", () => {
            window.location.href = "./app.html";
        });
    }
    const trimSelect = $("#profTrimSelect");
    if (trimSelect) {
        trimSelect.addEventListener("change", async (event) => {
            state.selectedTrimestreId = Number(event.target.value);
            await loadNotas();
        });
    }

    try {
        const profile = await api("/api/profesor/perfil");

        state.user = profile;
        state.docente = null;
        state.asignaciones = [];
        state.trimestres = [];
        state.selectedTrimestreId = null;

        fillUserUI(decoded, profile);
        await loadAcademicContext();
        try {
            const tutorData = await api("/api/profesor/tutor-estudiantes");
            state.tutorCursos = tutorData.cursos || [];
            renderTutorCursos();
        } catch (err) {
            const asistenciaPanel = document.getElementById("profAsistenciaTutorPanel");
            if (asistenciaPanel) {
                asistenciaPanel.innerHTML = `<div class="prof-empty">${escapeHTML(err.message)}</div>`;
            }
        }
    } catch (err) {
        showAlert("bad", err.message || "No se pudo cargar el portal.");
    }
}

document.addEventListener("DOMContentLoaded", init);
window.cerrarModalProfesor = cerrarModalProfesor;
window.guardarPerfilProfesor = guardarPerfilProfesor;
window.guardarPasswordProfesor = guardarPasswordProfesor;
window.guardarFotoPerfilProfesor = guardarFotoPerfilProfesor;
window.promptNotaUnica = promptNotaUnica;
window.marcarAsistenciaLocal = marcarAsistenciaLocal;
window.guardarAsistenciaCheck = async function(cursoId, paraleloId, matriculaId, tipo, checkbox) {
    const fecha = (document.getElementById("attFecha")?.value || new Date().toISOString().slice(0, 10));
    const estado = checkbox.checked ? tipo : "PRESENTE";
    checkbox.disabled = true;
    try {
        await api("/api/profesor/asistencia", {
            method: "POST",
            body: {
                curso_id: Number(cursoId),
                paralelo_id: Number(paraleloId),
                fecha,
                registros: [{ matricula_id: Number(matriculaId), estado }],
            },
        });
        showAlert("ok", `Asistencia guardada: ${estado}`);
    } catch (err) {
        showAlert("bad", err.message || "No se pudo guardar asistencia.");
        checkbox.checked = !checkbox.checked;
    } finally {
        checkbox.disabled = false;
    }
};
window.profCrearParcial = profCrearParcial;
window.profCrearInsumo = profCrearInsumo;
window.profGuardarNotaInsumo = profGuardarNotaInsumo;
window.profGuardarExamen = profGuardarExamen;
window.profCambiarEstadoParcial = profCambiarEstadoParcial;
window.profNotaUnicaParcial = profNotaUnicaParcial;
window.profNotaUnicaExamen = profNotaUnicaExamen;
window.profEditarFila = function() {};
window.profEliminarParcial = async function(parcialId, nombre) {
    const ok = confirm(`¿Seguro que deseas eliminar este parcial adicional?\n\n${nombre}\n\nSe eliminarán sus insumos y notas relacionadas.`);
    if (!ok) return;
    try {
        await api(`/api/academico/parciales/${parcialId}`, { method: "DELETE" });
        if (Number(state.selectedAcademicParcialId) === Number(parcialId)) {
            state.selectedAcademicParcialId = null;
        }
        await loadAcademicBook();
        showAlert("ok", "Parcial eliminado correctamente.");
    } catch (err) {
        showAlert("bad", err.message || "No se pudo eliminar el parcial.");
    }
};
window.cargarMateriasDocente = cargarMateriasDocente;
window.renderMateriasDocente = renderMateriasDocente;
window.seleccionarMateria = seleccionarMateria;
window.volverMateriasDocente = volverMateriasDocente;
window.renderPanelMateriaSeleccionada = renderPanelMateriaSeleccionada;
window.cargarInsumosPorMateria = cargarInsumosPorMateria;
window.cargarNotasPorMateria = cargarNotasPorMateria;
window.cargarExamenPorMateria = cargarExamenPorMateria;
window.seleccionarParcial = seleccionarParcial;
