/* ============================================================
   MÓDULO ACADÉMICO v2 — COLEGIO MIGUEL FEBRES CORDERO
   Archivo: frontend/assets/js/view-academico.js

   Adaptado 100% a la BD real sistema_educativo:
     - Usa periodos_lectivos (periodo activo automático)
     - Usa cursos + paralelos (selector combinado)
     - Usa asignaciones_docente para saber qué materia dar
     - Usa calificaciones con matricula_id + asignacion_id
     - Tipos de evaluación dinámicos desde tipos_evaluacion
     - EXAMEN se detecta por codigo = 'EXAMEN'
   ============================================================ */

/* ----------------------------------------------------------
   ESTILOS — inyectados una sola vez
   ---------------------------------------------------------- */
(function inyectarEstilosAcademico() {
    if (document.getElementById('acad-styles-v2')) return;
    const s = document.createElement('style');
    s.id = 'acad-styles-v2';
    s.textContent = `
    .acad-topbar {
        display:flex;align-items:center;justify-content:space-between;
        gap:12px;flex-wrap:wrap;margin-bottom:1.25rem;
    }
    .acad-topbar h3 { font-size:18px;font-weight:700;margin:0; }
    .acad-breadcrumb {
        display:flex;align-items:center;gap:6px;flex-wrap:wrap;
        font-size:13px;color:var(--muted);margin-bottom:1rem;
    }
    .acad-breadcrumb button {
        border:none;background:transparent;cursor:pointer;
        color:#1a5fa8;font-size:13px;font-weight:600;padding:0;
        text-decoration:underline;
    }
    .acad-breadcrumb span { color:var(--muted); }

    /* Selector cards */
    .acad-grid-sel {
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(210px,1fr));
        gap:12px;
    }
    .acad-card-sel {
        background:var(--panel);border:1px solid var(--stroke);
        border-radius:16px;padding:1.1rem;cursor:pointer;
        transition:.15s;display:flex;flex-direction:column;gap:5px;
    }
    .acad-card-sel:hover {
        border-color:#2563eb;
        box-shadow:0 4px 16px rgba(37,99,235,.10);
        transform:translateY(-2px);
    }
    .acad-card-sel h4 { font-size:14px;font-weight:700;margin:0; }
    .acad-card-sel small { font-size:12px;color:var(--muted); }

    /* Tabs trimestre */
    .acad-tabs {
        display:flex;gap:4px;
        border-bottom:1px solid var(--stroke);
        margin-bottom:1.25rem;
    }
    .acad-tab {
        padding:8px 18px;border:none;background:transparent;
        font-size:14px;font-weight:600;color:var(--muted);
        cursor:pointer;border-radius:10px 10px 0 0;
        transition:.12s;position:relative;bottom:-1px;
    }
    .acad-tab.on {
        color:#1a5fa8;
        border:1px solid var(--stroke);
        border-bottom:1px solid var(--panel);
        background:var(--panel);
    }

    /* Tabla de notas */
    .acad-tbl-wrap { overflow-x:auto; }
    .acad-tbl {
        width:100%;border-collapse:collapse;font-size:13px;
        min-width:700px;
    }
    .acad-tbl th {
        text-align:left;padding:8px 10px;
        font-size:11px;font-weight:700;color:var(--muted);
        letter-spacing:.4px;border-bottom:1px solid var(--stroke);
        white-space:nowrap;
    }
    .acad-tbl td {
        padding:7px 10px;
        border-bottom:.5px solid var(--stroke);
        vertical-align:middle;
    }
    .acad-tbl tr:hover td { background:var(--panel2); }
    .acad-tbl tr:last-child td { border-bottom:none; }
    .acad-alumno-cell { font-weight:700;text-transform:uppercase; }

    /* Inputs de nota inline */
    .nota-inp {
        width:58px;padding:4px 6px;
        border:1px solid var(--stroke);border-radius:8px;
        font-size:13px;background:var(--panel);color:var(--txt);
        text-align:center;transition:.12s;
    }
    .nota-inp:focus {
        outline:none;border-color:#2563eb;
        box-shadow:0 0 0 2px rgba(37,99,235,.12);
    }

    /* Chips de nota con color semáforo */
    .nota-chip {
        display:inline-block;font-weight:700;font-size:13px;
        padding:3px 9px;border-radius:8px;min-width:38px;text-align:center;
    }
    .nota-chip.a { background:#d1fae5;color:#065f46; }
    .nota-chip.m { background:#fef3c7;color:#92400e; }
    .nota-chip.b { background:#fee2e2;color:#991b1b; }
    .nota-chip.n { background:var(--panel2);color:var(--muted); }

    /* Barra resumen al pie */
    .acad-bar {
        display:flex;gap:14px;flex-wrap:wrap;
        background:var(--panel2);border-radius:12px;
        padding:12px 16px;margin-top:1rem;font-size:13px;
    }
    .acad-bar-item { display:flex;flex-direction:column;gap:2px; }
    .acad-bar-item span:first-child { font-size:11px;color:var(--muted);font-weight:600; }
    .acad-bar-item span:last-child  { font-weight:700;font-size:16px; }

    /* Botones */
    .acad-btn {
        border:1px solid var(--stroke);background:var(--panel);
        border-radius:10px;padding:6px 13px;cursor:pointer;
        font-size:13px;font-weight:600;color:var(--txt);
        transition:.12s;display:inline-flex;align-items:center;gap:5px;
    }
    .acad-btn:hover { background:var(--panel2); }
    .acad-btn.prim { background:#1a5fa8;color:#fff;border-color:#1a5fa8; }
    .acad-btn.prim:hover { background:#145090; }
    .acad-btn.sm { padding:4px 9px;font-size:12px;border-radius:8px; }
    .acad-btn.danger { color:#dc2626;border-color:#fca5a5; }
    .acad-btn.danger:hover { background:#fef2f2; }

    /* Modal overlay */
    .acad-overlay {
        position:fixed;inset:0;background:rgba(0,0,0,.45);
        display:flex;align-items:center;justify-content:center;
        z-index:1000;padding:1rem;
    }
    .acad-modal {
        background:var(--panel);border-radius:20px;
        border:1px solid var(--stroke);width:100%;
        max-width:540px;max-height:88vh;overflow-y:auto;
        box-shadow:0 20px 60px rgba(0,0,0,.15);
    }
    .acad-modal-hdr {
        padding:1.1rem 1.4rem;border-bottom:1px solid var(--stroke);
        display:flex;justify-content:space-between;align-items:center;
        position:sticky;top:0;background:var(--panel);z-index:1;
        border-radius:20px 20px 0 0;
    }
    .acad-modal-hdr h3 { margin:0;font-size:15px;font-weight:700; }
    .acad-modal-body { padding:1.25rem 1.4rem; }
    .acad-modal-ftr {
        padding:.9rem 1.4rem;border-top:1px solid var(--stroke);
        display:flex;justify-content:flex-end;gap:8px;
    }

    /* Reporte anual */
    .acad-reporte-grid {
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(270px,1fr));
        gap:12px;
    }
    .acad-mat-card {
        background:var(--panel);border:1px solid var(--stroke);
        border-radius:14px;padding:1rem;
    }
    .acad-mat-card h4 { font-size:13px;font-weight:700;margin:0 0 10px; }
    .acad-trim-row {
        display:flex;justify-content:space-between;
        font-size:12px;padding:4px 0;
        border-bottom:.5px solid var(--stroke);
    }
    .acad-trim-row:last-of-type { border:none; }

    .acad-empty {
        text-align:center;padding:2.5rem;
        color:var(--muted);font-size:14px;
    }
    .acad-admin-shell { display:grid; gap:14px; }
    .acad-prof-hero {
        display:flex;align-items:center;justify-content:space-between;
        gap:12px;flex-wrap:wrap;padding:14px 16px;
        border:1px solid var(--stroke);border-radius:16px;
        background:var(--panel);
    }
    .acad-prof-hero h2 { margin:0;font-size:24px; }
    .acad-prof-role {
        border:1px solid var(--stroke);border-radius:999px;
        padding:8px 14px;font-size:12px;font-weight:800;
        background:var(--panel2);color:var(--txt);
    }
    .acad-prof-tabs {
        display:flex;gap:8px;flex-wrap:wrap;
        padding:8px;border:1px solid var(--stroke);
        border-radius:16px;background:var(--panel);
    }
    .acad-prof-tab {
        border:1px solid transparent;border-radius:12px;
        padding:10px 14px;background:transparent;color:var(--muted);
        font-weight:800;cursor:pointer;
    }
    .acad-prof-tab.active {
        background:var(--panel2);border-color:#2563eb;color:#1d4ed8;
    }
    .admin-acad-section { padding:0; overflow:hidden; }
    .academic-shell { padding:12px; display:grid; gap:12px; }
    .acad-prof-summary {
        display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
        gap:10px;
    }
    .prof-stat {
        border:1px solid var(--stroke);border-radius:12px;
        padding:10px;background:var(--panel2);display:grid;gap:4px;
    }
    .prof-stat span { color:var(--muted);font-size:12px;font-weight:700; }
    .prof-stat strong { color:var(--txt);font-size:18px; }
    @media (max-width: 720px) {
        .acad-prof-hero { align-items:flex-start; }
        .acad-prof-tabs { overflow-x:auto; flex-wrap:nowrap; }
        .acad-prof-tab { white-space:nowrap; }
    }
    `;
    document.head.appendChild(s);
})();

/* ----------------------------------------------------------
   ESTADO DEL MÓDULO
   ---------------------------------------------------------- */
let _ac = {
    periodo:    null,   // { id, nombre }
    cursos:     [],
    paralelos:  [],
    trimestres: [],
    tipos:      [],     // tipos_evaluacion
    tipoExamen: null,
    tiposAct:   [],
    seccion:    'notas',
    // selección actual
    curso:      null,
    paralelo:   null,
    asignacion: null,   // { id, materia, curso, paralelo, ... }
    trimestre:  null,   // { id, nombre, numero }
    dataNota:   null,   // última respuesta del GET /notas
    asignaciones: [],
    libroNuevo: null,
    asignacionNueva: null,
};

/* ----------------------------------------------------------
   PUNTO DE ENTRADA
   ---------------------------------------------------------- */
async function mostrarModuloAcademico() {
    document.getElementById('pageTitle').textContent    = 'Académico';
    document.getElementById('pageSubtitle').textContent = 'Insumos, asistencia, documentacion y mensajes';
    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    document.getElementById('view-academico').hidden = false;

    const cont = document.getElementById('contenedor-academico');
    cont.innerHTML = '<div class="acad-empty">⏳ Cargando…</div>';

    try {
        // Cargar catálogos en paralelo
        const [periodo, cp, trims, tipos] = await Promise.all([
            api('/api/academico/periodo-activo'),
            api('/api/academico/cursos-paralelos'),
            api('/api/academico/trimestres'),
            api('/api/academico/tipos-evaluacion'),
        ]);

        _ac.periodo   = periodo;
        _ac.cursos    = cp.cursos;
        _ac.paralelos = cp.paralelos;
        _ac.trimestres = trims;
        _ac.tipos      = tipos;
        _ac.tipoExamen = tipos.find(t => t.codigo === 'EXAMEN') || null;
        _ac.tiposAct   = tipos.filter(t => t.codigo !== 'EXAMEN');
        _ac.trimestre  = trims[0] || null;

        _ac.asignaciones = await api(`/api/academico/asignaciones?periodo_id=${periodo.id}`);
        _ac.asignacionNueva = _ac.asignaciones[0] || null;
        _acadRenderAdminShell();
        await _acadCargarLibroNuevo();
    } catch (err) {
        cont.innerHTML = `<div class="acad-empty">⚠️ Error al inicializar el módulo académico.<br><small>${err.message}</small></div>`;
    }
}

function _acadNotaTxt(value) {
    if (value === null || value === undefined || value === '') return '-';
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '-';
}

function _acadTipoLabel(tipo) {
    return {
        TAREA: 'Tareas',
        LECCION: 'Leccion',
        TALLER: 'Actividad Grupal',
        APORTE: 'Prueba',
        INDIVIDUAL: 'Actividad Individual',
    }[tipo] || tipo;
}

function _acadChipClass(value) {
    if (value === null || value === undefined || value === '') return 'n';
    const n = Number(value);
    if (n >= 7) return 'a';
    if (n >= 5) return 'm';
    return 'b';
}

function _acadRenderAdminShell() {
    const cont = document.getElementById('contenedor-academico');
    if (!cont) return;
    cont.innerHTML = `
        <div class="acad-admin-shell">
            <div class="acad-prof-hero">
                <div>
                    <h2>Academico</h2>
                    <p class="muted">Misma estructura del portal profesor, con permisos globales de administrador.</p>
                </div>
                <div class="acad-prof-role">ADMIN</div>
            </div>
            <div class="acad-prof-tabs">
                <button class="acad-prof-tab active" data-admin-acad-section="materias">Materias</button>
                <button class="acad-prof-tab" data-admin-acad-section="asistencia">Asistencia</button>
                <button class="acad-prof-tab" data-admin-acad-section="simulacion">Simulacion</button>
                <button class="acad-prof-tab" data-admin-acad-section="documentacion">Documentacion</button>
                <button class="acad-prof-tab" data-admin-acad-section="mensajes">Mensajes</button>
            </div>
            <section class="card admin-acad-section" id="adminAcadMateriasPanel"></section>
            <section class="card admin-acad-section" id="adminAcadAsistenciaPanel" hidden>${_acadAdminAsistenciaHTML()}</section>
            <section class="card admin-acad-section" id="adminAcadSimulacionPanel" hidden>${_acadAdminSimulacionHTML()}</section>
            <section class="card admin-acad-section" id="adminAcadDocumentacionPanel" hidden>${_acadAdminDocumentacionHTML()}</section>
            <section class="card admin-acad-section" id="adminAcadMensajesPanel" hidden>${_acadAdminMensajesHTML()}</section>
        </div>
    `;

    cont.querySelectorAll("[data-admin-acad-section]").forEach(btn => {
        btn.addEventListener("click", () => _acadCambiarPanelAdmin(btn.dataset.adminAcadSection));
    });
}

function _acadCambiarPanelAdmin(section) {
    document.querySelectorAll("[data-admin-acad-section]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.adminAcadSection === section);
    });
    const panels = {
        materias: "adminAcadMateriasPanel",
        asistencia: "adminAcadAsistenciaPanel",
        simulacion: "adminAcadSimulacionPanel",
        documentacion: "adminAcadDocumentacionPanel",
        mensajes: "adminAcadMensajesPanel",
    };
    Object.entries(panels).forEach(([key, id]) => {
        const panel = document.getElementById(id);
        if (panel) panel.hidden = key !== section;
    });
}

function _acadAdminAsistenciaHTML() {
    return `
        <div class="card-head"><h3>Asistencia</h3></div>
        <div class="academic-shell">
            <div class="acad-prof-summary">
                <div class="prof-stat"><span>Alcance</span><strong>Todos</strong></div>
                <div class="prof-stat"><span>Cursos</span><strong>${_ac.cursos?.length || 0}</strong></div>
                <div class="prof-stat"><span>Paralelos</span><strong>${_ac.paralelos?.length || 0}</strong></div>
                <div class="prof-stat"><span>Periodo</span><strong>${_ac.periodo?.nombre || '-'}</strong></div>
            </div>
            <div class="acad-empty">El administrador conserva acceso global. La nomina por curso/paralelo se conecta desde el flujo de asistencia del modulo profesor y se puede ampliar aqui como siguiente fase.</div>
        </div>
    `;
}

function _acadAdminSimulacionHTML() {
    return `
        <div class="card-head"><h3>Simulacion academica</h3></div>
        <div class="academic-shell">
            <div class="acad-prof-summary">
                <div class="prof-stat"><span>Formula</span><strong>70/30</strong></div>
                <div class="prof-stat"><span>Parciales</span><strong>Dinamicos</strong></div>
                <div class="prof-stat"><span>Examen</span><strong>Separado</strong></div>
                <div class="prof-stat"><span>Vista</span><strong>Admin</strong></div>
            </div>
            <div class="acad-empty">La simulacion completa vive en el portal profesor. Esta pestana mantiene la misma estructura visual para el administrador.</div>
        </div>
    `;
}

function _acadAdminDocumentacionHTML() {
    return `
        <div class="card-head"><h3>Documentacion</h3></div>
        <div class="academic-shell">
            <div class="acad-reporte-grid">
                <div class="acad-mat-card"><h4>Modelo academico</h4><p class="muted">Periodo, trimestre, parciales dinamicos, insumos y examen trimestral separado.</p></div>
                <div class="acad-mat-card"><h4>Permisos</h4><p class="muted">Admin puede ver y corregir todo. Profesor solo gestiona sus asignaciones.</p></div>
                <div class="acad-mat-card"><h4>Especialidades</h4><p class="muted">Bachillerato puede filtrar estudiantes y asignaciones por especialidad.</p></div>
            </div>
        </div>
    `;
}

function _acadAdminMensajesHTML() {
    return `
        <div class="card-head"><h3>Mensajes</h3></div>
        <div class="academic-shell">
            <div class="acad-empty">Bandeja academica pendiente. Se deja igualada visualmente con el portal profesor para integrarla luego.</div>
        </div>
    `;
}

async function _acadCargarLibroNuevo() {
    const cont = document.getElementById('adminAcadMateriasPanel') || document.getElementById('contenedor-academico');
    if (!_ac.asignacionNueva || !_ac.trimestre) {
        cont.innerHTML = '<div class="acad-empty">No hay asignaciones academicas activas para el periodo.</div>';
        return;
    }
    try {
        _ac.libroNuevo = await api(`/api/academico/libro?asignacion_id=${_ac.asignacionNueva.id}&trimestre_id=${_ac.trimestre.id}`);
    } catch (err) {
        _ac.libroNuevo = { error: err.message, setup_required: true, parciales: [], alumnos: [] };
    }
    _acadRenderLibroNuevo();
}

function _acadRenderLibroNuevo() {
    const cont = document.getElementById('adminAcadMateriasPanel') || document.getElementById('contenedor-academico');
    const libro = _ac.libroNuevo || {};
    const parcial = (libro.parciales || [])[0] || null;
    cont.innerHTML = `
        <div class="acad-topbar">
            <div>
                <h3>Academico</h3>
                <p class="muted" style="margin:4px 0 0;">Administrador: acceso a todos los cursos, paralelos y profesores.</p>
            </div>
            <button class="acad-btn prim" onclick="_acadCrearParcialNuevo()">+ Crear parcial</button>
        </div>
        <div class="card" style="padding:14px;margin-bottom:14px;">
            <div class="acad-grid-sel">
                <label>
                    <strong>Curso / materia / profesor</strong>
                    <select class="nota-inp" style="width:100%;margin-top:6px;text-align:left;" onchange="_acadCambiarAsignacionNueva(this.value)">
                        ${_ac.asignaciones.map(a => `
                            <option value="${a.id}" ${Number(a.id) === Number(_ac.asignacionNueva?.id) ? 'selected' : ''}>
                                ${a.curso} ${a.paralelo} - ${a.materia} - ${a.docente_nombres || ''} ${a.docente_apellidos || ''}
                            </option>
                        `).join('')}
                    </select>
                </label>
                <label>
                    <strong>Trimestre</strong>
                    <select class="nota-inp" style="width:100%;margin-top:6px;text-align:left;" onchange="_acadCambiarTrimestreNuevo(this.value)">
                        ${_ac.trimestres.map(t => `
                            <option value="${t.id}" ${Number(t.id) === Number(_ac.trimestre?.id) ? 'selected' : ''}>${t.nombre}</option>
                        `).join('')}
                    </select>
                </label>
            </div>
        </div>
        ${libro.setup_required ? `
            <div class="acad-bar">
                <div class="acad-bar-item"><span>Periodo</span><span>${_ac.periodo?.nombre || '-'}</span></div>
                <div class="acad-bar-item"><span>Parciales</span><span>2 (visual)</span></div>
                <div class="acad-bar-item"><span>Estudiantes</span><span>${(_ac.libroNuevo?.alumnos || []).length}</span></div>
                <div class="acad-bar-item"><span>Formula</span><span>70% parciales / 30% examen</span></div>
            </div>
            <div class="card" style="padding:12px;margin-top:12px;">
                <strong>Parciales:</strong>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
                    <button class="acad-btn sm prim">PARCIAL 1</button>
                    <button class="acad-btn sm">PARCIAL 2</button>
                    <button class="acad-btn sm" onclick="showAlert('bad','Modo visual activo: ejecuta database/academico-parciales-insumos.sql para guardar cambios reales.')">+</button>
                </div>
                <div style="margin-top:8px;font-size:12px;color:#64748b;">PARCIAL 1 y PARCIAL 2 son obligatorios y no se pueden eliminar.</div>
                <div style="margin-top:4px;font-size:12px;color:#b45309;">Modo visual activo: se muestra estructura base, pero no guarda hasta ejecutar SQL en Railway.</div>
            </div>
            <div class="acad-empty">${libro.error}<br><small>Ejecuta database/academico-parciales-insumos.sql en Railway MySQL.</small></div>
        ` : `
            <div class="acad-bar">
                <div class="acad-bar-item"><span>Periodo</span><span>${_ac.periodo?.nombre || '-'}</span></div>
                <div class="acad-bar-item"><span>Parciales</span><span>${(libro.parciales || []).length}</span></div>
                <div class="acad-bar-item"><span>Estudiantes</span><span>${(libro.alumnos || []).length}</span></div>
                <div class="acad-bar-item"><span>Formula</span><span>70% parciales / 30% examen</span></div>
            </div>
            <div class="acad-reporte-grid" style="margin:14px 0;">
                ${(libro.parciales || []).map((p, idx) => `
                    <div class="acad-mat-card" style="${idx === 0 ? 'border-color:#2563eb;' : ''}">
                        <h4>${p.nombre}</h4>
                        <div class="acad-trim-row"><span>Estado</span><strong>${p.estado}</strong></div>
                        <div class="acad-trim-row"><span>Insumos</span><strong>${p.insumos.length}</strong></div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
                            <button class="acad-btn sm" onclick="_acadCrearInsumoNuevo(${p.id}, 'TAREA')">+ Tareas</button>
                            <button class="acad-btn sm" onclick="_acadCrearInsumoNuevo(${p.id}, 'INDIVIDUAL')">+ Actividad Individual</button>
                            <button class="acad-btn sm" onclick="_acadCrearInsumoNuevo(${p.id}, 'TALLER')">+ Actividad Grupal</button>
                            <button class="acad-btn sm" onclick="_acadCrearInsumoNuevo(${p.id}, 'LECCION')">+ Leccion</button>
                            <button class="acad-btn sm" onclick="_acadCrearInsumoNuevo(${p.id}, 'APORTE')">+ Prueba</button>
                            <button class="acad-btn sm" onclick="_acadNotaUnicaParcialNuevo(${p.id})">Nota unica</button>
                            <button class="acad-btn sm" onclick="_acadCambiarEstadoParcialNuevo(${p.id}, '${p.estado === 'CERRADO' ? 'ABIERTO' : 'CERRADO'}')">${p.estado === 'CERRADO' ? 'Reabrir' : 'Cerrar'}</button>
                        </div>
                        <div style="margin-top:10px;display:grid;gap:6px;">
                            ${(p.insumos || []).length ? p.insumos.map(i => `
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--stroke);border-radius:10px;padding:7px 9px;background:var(--panel2);">
                                    <div>
                                        <strong>${i.nombre}</strong>
                                        <small style="display:block;color:var(--muted)">Tipo: ${_acadTipoLabel(i.tipo)}</small>
                                    </div>
                                    <button class="acad-btn sm danger" onclick="_acadEliminarInsumoNuevo(${i.id}, '${i.nombre.replace(/'/g, "\\'")}')">Eliminar</button>
                                </div>
                            `).join('') : `<small class="muted">Sin insumos creados.</small>`}
                        </div>
                    </div>
                `).join('')}
            </div>
            ${parcial ? _acadRenderTablaParcialNuevo(parcial) : '<div class="acad-empty">Crea un parcial para empezar a registrar insumos.</div>'}
        `}
    `;
}

function _acadRenderTablaParcialNuevo(parcial) {
    const alumnos = _ac.libroNuevo?.alumnos || [];
    return `
        <div class="card" style="overflow:hidden;">
            <div class="acad-topbar" style="padding:14px;margin:0;border-bottom:1px solid var(--stroke);">
                <h3>${parcial.nombre}</h3>
                <button class="acad-btn" onclick="_acadNotaUnicaExamenNuevo()">Nota unica examen</button>
            </div>
            <div class="acad-tbl-wrap">
                <table class="acad-tbl">
                    <thead>
                        <tr>
                            <th>Estudiante</th>
                            ${parcial.insumos.map(i => `<th>${i.nombre}<br><small>${_acadTipoLabel(i.tipo)}</small></th>`).join('')}
                            <th>Prom. parcial</th>
                            <th>Examen trimestral</th>
                            <th>Prom. parciales</th>
                            <th>Final trimestre</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${alumnos.map(al => {
                            const parcialAlumno = (al.parciales || []).find(p => Number(p.parcial_id) === Number(parcial.id));
                            return `
                                <tr>
                                    <td class="acad-alumno-cell">${al.apellidos_est}, ${al.nombres_est}<br><small class="muted">${al.cedula_est || '-'}</small></td>
                                    ${parcial.insumos.map(i => {
                                        const nota = i.notas?.[String(al.matricula_id)]?.nota ?? '';
                                        return `<td><input class="nota-inp" type="number" min="0" max="10" step="0.01" value="${nota}" onchange="_acadGuardarNotaInsumoNuevo(${i.id}, ${al.matricula_id}, this.value)"></td>`;
                                    }).join('')}
                                    <td><span class="nota-chip ${_acadChipClass(parcialAlumno?.promedio)}">${_acadNotaTxt(parcialAlumno?.promedio)}</span></td>
                                    <td><input class="nota-inp" type="number" min="0" max="10" step="0.01" value="${al.examen_trimestral ?? ''}" onchange="_acadGuardarExamenNuevo(${al.matricula_id}, this.value)"></td>
                                    <td><span class="nota-chip ${_acadChipClass(al.promedio_parciales)}">${_acadNotaTxt(al.promedio_parciales)}</span></td>
                                    <td><span class="nota-chip ${_acadChipClass(al.nota_trimestral)}">${_acadNotaTxt(al.nota_trimestral)}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function _acadCambiarAsignacionNueva(id) {
    _ac.asignacionNueva = _ac.asignaciones.find(a => Number(a.id) === Number(id)) || null;
    await _acadCargarLibroNuevo();
}

async function _acadCambiarTrimestreNuevo(id) {
    _ac.trimestre = _ac.trimestres.find(t => Number(t.id) === Number(id)) || _ac.trimestre;
    await _acadCargarLibroNuevo();
}

async function _acadCrearParcialNuevo() {
    const nombre = prompt('Nombre del parcial:', '');
    if (nombre === null) return;
    await api('/api/academico/parciales', { method: 'POST', body: { asignacion_id: _ac.asignacionNueva.id, trimestre_id: _ac.trimestre.id, nombre: nombre.trim() || undefined } });
    await _acadCargarLibroNuevo();
}

async function _acadCrearInsumoNuevo(parcialId, tipo) {
    const nombre = prompt(`Nombre de ${_acadTipoLabel(tipo)}:`, '');
    if (nombre === null) return;
    await api('/api/academico/insumos', { method: 'POST', body: { parcial_id: parcialId, tipo, nombre: nombre.trim() || undefined } });
    await _acadCargarLibroNuevo();
}

async function _acadGuardarNotaInsumoNuevo(insumoId, matriculaId, nota) {
    if (nota === '') return;
    await api('/api/academico/notas-insumo', { method: 'POST', body: { insumo_id: insumoId, matricula_id: matriculaId, nota } });
    await _acadCargarLibroNuevo();
}

async function _acadGuardarExamenNuevo(matriculaId, nota) {
    if (nota === '') return;
    await api('/api/academico/examen-trimestral', { method: 'POST', body: { asignacion_id: _ac.asignacionNueva.id, trimestre_id: _ac.trimestre.id, matricula_id: matriculaId, nota } });
    await _acadCargarLibroNuevo();
}

async function _acadCambiarEstadoParcialNuevo(parcialId, estado) {
    await api(`/api/academico/parciales/${parcialId}/estado`, { method: 'PATCH', body: { estado } });
    await _acadCargarLibroNuevo();
}

async function _acadNotaUnicaParcialNuevo(parcialId) {
    const nota = prompt('Nota unica para todos los insumos del parcial:');
    if (nota === null) return;
    await api('/api/academico/nota-unica', { method: 'POST', body: { parcial_id: parcialId, nota } });
    await _acadCargarLibroNuevo();
}

async function _acadNotaUnicaExamenNuevo() {
    const nota = prompt('Nota unica para el examen trimestral:');
    if (nota === null) return;
    await api('/api/academico/nota-unica', { method: 'POST', body: { asignacion_id: _ac.asignacionNueva.id, trimestre_id: _ac.trimestre.id, alcance: 'EXAMEN', nota } });
    await _acadCargarLibroNuevo();
}

async function _acadEliminarInsumoNuevo(insumoId, nombre) {
    const ok = confirm(`¿Eliminar insumo?\n\n${nombre}\n\nSe eliminarán sus notas relacionadas.`);
    if (!ok) return;
    await api(`/api/academico/insumos/${insumoId}`, { method: 'DELETE' });
    await _acadCargarLibroNuevo();
}

/* ----------------------------------------------------------
   BREADCRUMB helper
   ---------------------------------------------------------- */
function _acadBreadcrumb(pasos) {
    // pasos = [ { label, fn }, { label } ]  — último sin fn (actual)
    return `<div class="acad-breadcrumb">
        ${pasos.map((p, i) => {
            const sep = i > 0 ? '<span>›</span>' : '';
            if (p.fn) return `${sep}<button onclick="${p.fn}">${p.label}</button>`;
            return `${sep}<strong>${p.label}</strong>`;
        }).join('')}
        <span style="margin-left:auto;font-size:11px;background:#e8f1fb;
                     color:#1a5fa8;padding:3px 10px;border-radius:999px;font-weight:700">
            📅 ${_ac.periodo?.nombre || '—'}
        </span>
    </div>`;
}

/* ----------------------------------------------------------
   PASO 1: Seleccionar Curso + Paralelo
   ---------------------------------------------------------- */
function _acadRenderSubmenu() {
    return `
        <div style="margin-bottom:14px">
            <div class="acad-grid-sel">
                <div class="acad-card-sel" onclick="_acadCambiarSeccion('notas')" style="${_ac.seccion === 'notas' ? 'border-color:#1a5fa8;box-shadow:0 4px 16px rgba(37,99,235,.12);' : ''}">
                    <h4>📘 Insumos / Notas</h4>
                    <small>Registro y seguimiento trimestral</small>
                </div>
                <div class="acad-card-sel" onclick="_acadCambiarSeccion('asistencia')" style="${_ac.seccion === 'asistencia' ? 'border-color:#1a5fa8;box-shadow:0 4px 16px rgba(37,99,235,.12);' : ''}">
                    <h4>🗓️ Asistencia</h4>
                    <small>Control diario de asistencia</small>
                </div>
                <div class="acad-card-sel" onclick="_acadCambiarSeccion('documentacion')" style="${_ac.seccion === 'documentacion' ? 'border-color:#1a5fa8;box-shadow:0 4px 16px rgba(37,99,235,.12);' : ''}">
                    <h4>📂 Documentación</h4>
                    <small>Guías y procesos académicos</small>
                </div>
                <div class="acad-card-sel" onclick="_acadCambiarSeccion('mensajes')" style="${_ac.seccion === 'mensajes' ? 'border-color:#1a5fa8;box-shadow:0 4px 16px rgba(37,99,235,.12);' : ''}">
                    <h4>💬 Mensajes</h4>
                    <small>Comunicaciones y avisos</small>
                </div>
            </div>
        </div>
    `;
}

function _acadCambiarSeccion(seccion) {
    _ac.seccion = seccion;
    if (seccion === 'notas') return _acadPaso1Curso();
    if (seccion === 'asistencia') return _acadRenderAsistencia();
    if (seccion === 'documentacion') return _acadRenderDocumentacion();
    if (seccion === 'mensajes') return _acadRenderMensajes();
}

function _acadPaso1Curso() {
    const cont = document.getElementById('contenedor-academico');
    cont.innerHTML = `
        <div class="acad-topbar">
            <h3>Académico</h3>
        </div>
        ${_acadRenderSubmenu()}
        ${_acadBreadcrumb([{ label: 'Cursos' }])}
        <p style="font-size:13px;color:var(--muted);margin-bottom:1rem">
            Selecciona el curso y paralelo para gestionar sus calificaciones.
        </p>
        <div class="acad-grid-sel">
            ${_ac.cursos.map(c => `
                <div class="acad-card-sel" onclick="_acadSelCurso(${c.id},'${c.nombre}')">
                    <h4>🎓 ${c.nombre}</h4>
                    <small>${c.nivel} · ${c.codigo}</small>
                </div>
            `).join('')}
        </div>
    `;
}

function _acadRenderAsistencia() {
    const cont = document.getElementById('contenedor-academico');
    const today = new Date().toISOString().slice(0, 10);
    cont.innerHTML = `
        <div class="acad-topbar"><h3>Académico</h3></div>
        ${_acadRenderSubmenu()}
        <div class="card" style="padding:14px;">
            <h3 style="margin:0 0 10px;text-align:center">CONTROL DE ASISTENCIA</h3>
            <div class="acad-grid-sel">
                <label><strong>Curso</strong><select class="nota-inp" style="width:100%;text-align:left">${_ac.cursos.map(c => `<option>${c.nombre}</option>`).join('')}</select></label>
                <label><strong>Especialidad</strong><input class="nota-inp" style="width:100%;text-align:left" value="GENERAL" disabled></label>
                <label><strong>Paralelo</strong><select class="nota-inp" style="width:100%;text-align:left">${_ac.paralelos.map(p => `<option>${p.nombre}</option>`).join('')}</select></label>
                <label><strong>Materia</strong><input class="nota-inp" style="width:100%;text-align:left" value="TUTORÍA" disabled></label>
                <label><strong>Parcial</strong><select class="nota-inp" style="width:100%;text-align:left"><option>Primero</option><option>Segundo</option><option>Tercero</option></select></label>
                <label><strong>Trimestre</strong><select class="nota-inp" style="width:100%;text-align:left"><option>Primero</option><option>Segundo</option><option>Tercero</option></select></label>
            </div>
        </div>
        <div class="card" style="padding:14px;margin-top:12px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
                <button class="acad-btn">Nómina</button>
                <button class="acad-btn">Porcentaje Asistencia</button>
                <button class="acad-btn">Control de Faltas</button>
                <button class="acad-btn">Control de Atrasos</button>
            </div>
            <div class="acad-grid-sel" style="grid-template-columns:repeat(4,minmax(140px,1fr));margin-bottom:10px">
                <label><strong>Fecha</strong><input class="nota-inp" style="width:100%" type="date" value="${today}"></label>
                <label><strong>Carga Horaria</strong><input class="nota-inp" style="width:100%" type="number" value="1"></label>
                <label><strong>Días Laborables</strong><input class="nota-inp" style="width:100%" type="number" value="35"></label>
                <label><strong>N° Horas Diarias</strong><input class="nota-inp" style="width:100%" type="number" value="1"></label>
            </div>
            <div class="acad-tbl-wrap">
                <table class="acad-tbl">
                    <thead>
                        <tr><th>N°</th><th>Estudiante</th><th>Atrasos</th><th>Inasistencia</th></tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="4" class="muted">Seleccione curso/paralelo para cargar nómina en la próxima fase.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function _acadRenderDocumentacion() {
    const cont = document.getElementById('contenedor-academico');
    cont.innerHTML = `
        <div class="acad-topbar"><h3>Académico</h3></div>
        ${_acadRenderSubmenu()}
        <div class="card" style="padding:14px;">
            <h3 style="margin:0 0 10px;">Documentación</h3>
            <p class="muted" style="margin:0;">
                Aquí se publicarán guías y procesos del módulo académico para administración y docentes.
            </p>
        </div>
    `;
}

function _acadRenderMensajes() {
    const cont = document.getElementById('contenedor-academico');
    cont.innerHTML = `
        <div class="acad-topbar"><h3>Académico</h3></div>
        ${_acadRenderSubmenu()}
        <div class="card" style="padding:14px;">
            <h3 style="margin:0 0 10px;">Mensajes</h3>
            <p class="muted" style="margin:0;">
                Bandeja de mensajes institucionales y avisos del módulo académico.
            </p>
        </div>
    `;
}

async function _acadSelCurso(cursoId, nombreCurso) {
    _ac.curso = { id: cursoId, nombre: nombreCurso };
    const cont = document.getElementById('contenedor-academico');

    if (_ac.paralelos.length === 1) {
        // Solo un paralelo → saltar directo a materias
        _ac.paralelo = _ac.paralelos[0];
        await _acadPaso2Materias();
        return;
    }

    cont.innerHTML = `
        <div class="acad-topbar"><h3>Seleccionar Paralelo</h3></div>
        ${_acadBreadcrumb([
            { label: 'Cursos', fn: '_acadPaso1Curso()' },
            { label: nombreCurso },
        ])}
        <div class="acad-grid-sel">
            ${_ac.paralelos.map(p => `
                <div class="acad-card-sel"
                     onclick="_acadSelParalelo(${p.id},'${p.nombre}')">
                    <h4>📋 Paralelo ${p.nombre}</h4>
                    <small>${nombreCurso}</small>
                </div>
            `).join('')}
        </div>
    `;
}

async function _acadSelParalelo(paraleloId, nombreParalelo) {
    _ac.paralelo = { id: paraleloId, nombre: nombreParalelo };
    await _acadPaso2Materias();
}

/* ----------------------------------------------------------
   PASO 2: Seleccionar Materia (asignación del docente)
   ---------------------------------------------------------- */
async function _acadPaso2Materias() {
    const cont = document.getElementById('contenedor-academico');
    cont.innerHTML = '<div class="acad-empty">⏳ Cargando materias…</div>';

    try {
        const asignaciones = await api(
            `/api/academico/asignaciones?curso_id=${_ac.curso.id}&paralelo_id=${_ac.paralelo.id}&periodo_id=${_ac.periodo.id}`
        );

        if (!asignaciones.length) {
            cont.innerHTML = `
                ${_acadBreadcrumb([
                    { label: 'Cursos', fn: '_acadPaso1Curso()' },
                    { label: _ac.curso.nombre, fn: `_acadSelCurso(${_ac.curso.id},'${_ac.curso.nombre}')` },
                    { label: `Paralelo ${_ac.paralelo.nombre}` },
                ])}
                <div class="acad-empty">
                    📭 No hay materias asignadas a este curso/paralelo en el período activo.<br>
                    <small>Asigna docentes desde el módulo de administración.</small>
                </div>`;
            return;
        }

        cont.innerHTML = `
            <div class="acad-topbar">
                <h3>${_ac.curso.nombre} — Paralelo ${_ac.paralelo.nombre}</h3>
                <button class="acad-btn" onclick="_acadVerReporteAnual()">
                    📊 Reporte anual del curso
                </button>
            </div>
            ${_acadBreadcrumb([
                { label: 'Cursos', fn: '_acadPaso1Curso()' },
                { label: _ac.curso.nombre, fn: `_acadSelCurso(${_ac.curso.id},'${_ac.curso.nombre}')` },
                { label: `Paralelo ${_ac.paralelo.nombre}` },
            ])}
            <p style="font-size:13px;color:var(--muted);margin-bottom:1rem">
                Selecciona la materia para ingresar o revisar notas.
            </p>
            <div class="acad-grid-sel">
                ${asignaciones.map(a => `
                    <div class="acad-card-sel" onclick="_acadSelAsignacion(${a.id})">
                        <h4>📖 ${a.materia}</h4>
                        <small>Prof. ${a.docente_apellidos} ${a.docente_nombres}</small>
                        <small style="color:#1a5fa8;font-weight:600">${a.materia_codigo}</small>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        cont.innerHTML = `<div class="acad-empty">⚠️ Error al cargar materias.<br><small>${err.message}</small></div>`;
    }
}

/* ----------------------------------------------------------
   PASO 3: Vista de notas por trimestre
   ---------------------------------------------------------- */
async function _acadSelAsignacion(asignacionId) {
    // Buscar la asignación en la lista ya cargada o hacer fetch
    const asignaciones = await api(
        `/api/academico/asignaciones?curso_id=${_ac.curso.id}&paralelo_id=${_ac.paralelo.id}&periodo_id=${_ac.periodo.id}`
    );
    _ac.asignacion = asignaciones.find(a => a.id === asignacionId) || { id: asignacionId };
    if (!_ac.trimestre) _ac.trimestre = _ac.trimestres[0];
    await _acadPaso3Notas();
}

async function _acadPaso3Notas() {
    const cont = document.getElementById('contenedor-academico');
    cont.innerHTML = '<div class="acad-empty">⏳ Cargando calificaciones…</div>';
    try {
        const data = await api(
            `/api/academico/notas?asignacion_id=${_ac.asignacion.id}&trimestre_id=${_ac.trimestre.id}`
        );
        _ac.dataNota = data;

        cont.innerHTML = `
            <div class="acad-topbar">
                <h3>📖 ${data.asignacion?.materia || _ac.asignacion.materia || 'Materia'}</h3>
                <button class="acad-btn prim sm" onclick="_acadAbrirModalNota()">
                    ✚ Agregar nota
                </button>
            </div>
            ${_acadBreadcrumb([
                { label: 'Cursos', fn: '_acadPaso1Curso()' },
                { label: _ac.curso.nombre, fn: `_acadSelCurso(${_ac.curso.id},'${_ac.curso.nombre}')` },
                { label: `Paralelo ${_ac.paralelo.nombre}`, fn: '_acadPaso2Materias()' },
                { label: data.asignacion?.materia || 'Materia' },
            ])}

            <div class="acad-tabs">
                ${_ac.trimestres.map(t => `
                    <button class="acad-tab ${t.id === _ac.trimestre.id ? 'on' : ''}"
                            onclick="_acadCambiarTrimestre(${t.id})">
                        ${t.nombre}
                    </button>
                `).join('')}
            </div>

            <div class="acad-tbl-wrap">
                ${_acadRenderTabla(data)}
            </div>

            ${_acadRenderResumen(data.alumnos || [])}
        `;
    } catch (err) {
        cont.innerHTML = `<div class="acad-empty">⚠️ Error al cargar notas.<br><small>${err.message}</small></div>`;
    }
}

function _acadRenderTabla(data) {
    const alumnos = data.alumnos || [];
    const tipos   = data.tipos   || [];
    const tiposAct = tipos.filter(t => t.codigo !== 'EXAMEN');
    const tipoEx   = data.tipo_examen;

    if (!alumnos.length) return '<div class="acad-empty">📭 No hay alumnos matriculados en este curso.</div>';

    const chip = (v) => {
        if (v === null || v === undefined) return `<span class="nota-chip n">—</span>`;
        const cls = v >= 7 ? 'a' : v >= 5 ? 'm' : 'b';
        return `<span class="nota-chip ${cls}">${v}</span>`;
    };

    return `
        <table class="acad-tbl">
            <thead>
                <tr>
                    <th>Alumno</th>
                    ${tiposAct.map(t => `<th>${t.nombre}</th>`).join('')}
                    <th>Prom. Act (70%)</th>
                    ${tipoEx ? `<th>Examen (30%)</th>` : ''}
                    <th>Nota Trimestral</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${alumnos.map(al => `
                    <tr>
                        <td class="acad-alumno-cell">
                            ${al.apellidos_est}, ${al.nombres_est}
                        </td>
                        ${tiposAct.map(t => {
                            const n = al.notas?.[t.id];
                            return `<td>
                                <input class="nota-inp" type="number"
                                       min="0" max="10" step="0.01"
                                       value="${n ? n.nota : ''}"
                                       placeholder="—"
                                       title="${t.nombre} — ${al.nombres_est}"
                                       onchange="_acadGuardarNota(
                                           ${al.matricula_id},
                                           ${t.id},
                                           this.value,
                                           ${n ? n.id : 'null'}
                                       )">
                            </td>`;
                        }).join('')}
                        <td>${chip(al.promedio_actividades)}</td>
                        ${tipoEx ? `<td>
                            <input class="nota-inp" type="number"
                                   min="0" max="10" step="0.01"
                                   value="${al.examen_trimestral !== null ? al.examen_trimestral : ''}"
                                   placeholder="—"
                                   title="Examen — ${al.nombres_est}"
                                   onchange="_acadGuardarNota(
                                       ${al.matricula_id},
                                       ${tipoEx.id},
                                       this.value,
                                       ${al.notas?.[tipoEx.id] ? al.notas[tipoEx.id].id : 'null'}
                                   )">
                        </td>` : ''}
                        <td>${chip(al.nota_trimestral)}</td>
                        <td>
                            <button class="acad-btn sm"
                                    onclick="_acadVerDetalle(${al.matricula_id}, '${al.apellidos_est} ${al.nombres_est}')">
                                Ver
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function _acadRenderResumen(alumnos) {
    if (!alumnos.length) return '';
    const conNota = alumnos.filter(a => a.nota_trimestral !== null);
    const prom = conNota.length
        ? (conNota.reduce((s, a) => s + a.nota_trimestral, 0) / conNota.length).toFixed(2)
        : '—';
    const sobre7  = alumnos.filter(a => a.nota_trimestral >= 7).length;
    const bajo5   = alumnos.filter(a => a.nota_trimestral !== null && a.nota_trimestral < 5).length;
    return `
        <div class="acad-bar">
            <div class="acad-bar-item"><span>Alumnos</span><span>${alumnos.length}</span></div>
            <div class="acad-bar-item"><span>Promedio del curso</span><span>${prom}</span></div>
            <div class="acad-bar-item"><span>Aprobados (≥7)</span><span style="color:#065f46">${sobre7}</span></div>
            <div class="acad-bar-item"><span>En riesgo (&lt;5)</span><span style="color:#dc2626">${bajo5}</span></div>
        </div>
    `;
}

async function _acadCambiarTrimestre(trimestreId) {
    _ac.trimestre = _ac.trimestres.find(t => t.id === trimestreId) || _ac.trimestre;
    await _acadPaso3Notas();
}

/* ----------------------------------------------------------
   GUARDAR NOTA (inline desde la tabla)
   ---------------------------------------------------------- */
async function _acadGuardarNota(matriculaId, tipoEvalId, valor, notaId) {
    if (valor === '' || valor === null) return;
    const v = parseFloat(valor);
    if (isNaN(v) || v < 0 || v > 10) {
        showAlert('bad', 'La nota debe estar entre 0 y 10.');
        return;
    }
    try {
        await api('/api/academico/notas', {
            method: 'POST',
            body: JSON.stringify({
                matricula_id:       matriculaId,
                asignacion_id:      _ac.asignacion.id,
                trimestre_id:       _ac.trimestre.id,
                tipo_evaluacion_id: tipoEvalId,
                nota:               v,
            }),
        });
        showAlert('ok', 'Nota guardada ✅');
        // Recargar tabla sin perder el scroll
        await _acadPaso3Notas();
    } catch (err) {
        showAlert('bad', err.message || 'Error al guardar la nota.');
    }
}

/* ----------------------------------------------------------
   MODAL AGREGAR NOTA (para un solo alumno de golpe)
   ---------------------------------------------------------- */
function _acadAbrirModalNota() {
    const data = _ac.dataNota;
    if (!data?.alumnos?.length) { showAlert('bad', 'No hay alumnos en este curso.'); return; }

    const overlay = document.createElement('div');
    overlay.id = 'acad-ov-nota';
    overlay.className = 'acad-overlay';
    overlay.innerHTML = `
        <div class="acad-modal">
            <div class="acad-modal-hdr">
                <h3>Agregar nota</h3>
                <button class="acad-btn sm" onclick="document.getElementById('acad-ov-nota').remove()">✕</button>
            </div>
            <div class="acad-modal-body" style="display:grid;gap:12px">
                <div style="display:flex;flex-direction:column;gap:4px">
                    <label style="font-size:12px;font-weight:700;color:var(--muted)">Alumno</label>
                    <select id="acad-inp-alumno"
                            style="padding:8px;border:1px solid var(--stroke);
                                   border-radius:10px;background:var(--panel);
                                   color:var(--txt);font-size:14px">
                        ${data.alumnos.map(al =>
                            `<option value="${al.matricula_id}">${al.apellidos_est}, ${al.nombres_est}</option>`
                        ).join('')}
                    </select>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px">
                    <label style="font-size:12px;font-weight:700;color:var(--muted)">Tipo de evaluación</label>
                    <select id="acad-inp-tipo"
                            style="padding:8px;border:1px solid var(--stroke);
                                   border-radius:10px;background:var(--panel);
                                   color:var(--txt);font-size:14px">
                        ${(data.tipos || []).map(t =>
                            `<option value="${t.id}">${t.nombre}</option>`
                        ).join('')}
                    </select>
                </div>
                <div style="display:flex;gap:10px">
                    <div style="flex:1;display:flex;flex-direction:column;gap:4px">
                        <label style="font-size:12px;font-weight:700;color:var(--muted)">Nota (0 – 10)</label>
                        <input type="number" id="acad-inp-nota"
                               min="0" max="10" step="0.01" placeholder="0.00"
                               style="padding:8px;border:1px solid var(--stroke);
                                      border-radius:10px;background:var(--panel);
                                      color:var(--txt);font-size:14px;text-align:center">
                    </div>
                    <div style="flex:2;display:flex;flex-direction:column;gap:4px">
                        <label style="font-size:12px;font-weight:700;color:var(--muted)">Observación (opcional)</label>
                        <input type="text" id="acad-inp-obs"
                               placeholder="Ej: Lección #2 Capítulo 3"
                               style="padding:8px;border:1px solid var(--stroke);
                                      border-radius:10px;background:var(--panel);
                                      color:var(--txt);font-size:14px">
                    </div>
                </div>
            </div>
            <div class="acad-modal-ftr">
                <button class="acad-btn" onclick="document.getElementById('acad-ov-nota').remove()">Cancelar</button>
                <button class="acad-btn prim" onclick="_acadConfirmarNota()">✅ Guardar nota</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _acadConfirmarNota() {
    const matricula_id       = document.getElementById('acad-inp-alumno').value;
    const tipo_evaluacion_id = document.getElementById('acad-inp-tipo').value;
    const nota               = document.getElementById('acad-inp-nota').value;
    const observacion        = document.getElementById('acad-inp-obs').value.trim();

    if (!nota) { showAlert('bad', 'Ingresa el valor de la nota.'); return; }

    try {
        await api('/api/academico/notas', {
            method: 'POST',
            body: JSON.stringify({
                matricula_id:       parseInt(matricula_id),
                asignacion_id:      _ac.asignacion.id,
                trimestre_id:       _ac.trimestre.id,
                tipo_evaluacion_id: parseInt(tipo_evaluacion_id),
                nota:               parseFloat(nota),
                observacion,
            }),
        });
        document.getElementById('acad-ov-nota')?.remove();
        showAlert('ok', 'Nota registrada ✅');
        await _acadPaso3Notas();
    } catch (err) {
        showAlert('bad', err.message || 'Error al guardar.');
    }
}

/* ----------------------------------------------------------
   VER DETALLE DE UN ALUMNO
   ---------------------------------------------------------- */
function _acadVerDetalle(matriculaId, nombre) {
    const data = _ac.dataNota;
    const al   = data?.alumnos?.find(a => a.matricula_id === matriculaId);
    if (!al) return;

    const tipos = data.tipos || [];
    const chip  = (v) => {
        if (v === null || v === undefined) return `<span class="nota-chip n">—</span>`;
        const cls = v >= 7 ? 'a' : v >= 5 ? 'm' : 'b';
        return `<span class="nota-chip ${cls}">${parseFloat(v).toFixed(2)}</span>`;
    };

    const overlay = document.createElement('div');
    overlay.id = 'acad-ov-det';
    overlay.className = 'acad-overlay';
    overlay.innerHTML = `
        <div class="acad-modal">
            <div class="acad-modal-hdr">
                <div>
                    <h3>${nombre}</h3>
                    <p style="margin:2px 0 0;font-size:12px;color:var(--muted)">
                        ${_ac.asignacion?.materia || '—'} · ${_ac.trimestre?.nombre || '—'}
                    </p>
                </div>
                <button class="acad-btn sm" onclick="document.getElementById('acad-ov-det').remove()">✕</button>
            </div>
            <div class="acad-modal-body">
                ${tipos.map(t => {
                    const n = al.notas?.[t.id];
                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;
                                    padding:8px 0;border-bottom:.5px solid var(--stroke)">
                            <span style="font-size:13px;color:var(--muted);font-weight:600">
                                ${t.nombre}
                            </span>
                            <div style="display:flex;align-items:center;gap:8px">
                                ${chip(n?.nota)}
                                ${n?.id ? `
                                    <button class="acad-btn sm danger"
                                            onclick="_acadEliminarNota(${n.id})"
                                            title="Eliminar">🗑</button>
                                ` : ''}
                            </div>
                        </div>`;
                }).join('')}

                <div class="acad-bar" style="margin-top:1rem">
                    <div class="acad-bar-item">
                        <span>Actividades (70%)</span>
                        <span>${al.promedio_actividades !== null ? al.promedio_actividades : '—'}</span>
                    </div>
                    <div class="acad-bar-item">
                        <span>Examen (30%)</span>
                        <span>${al.examen_trimestral !== null ? al.examen_trimestral : '—'}</span>
                    </div>
                    <div class="acad-bar-item">
                        <span>Nota trimestral</span>
                        <span style="color:${al.nota_trimestral >= 7 ? '#065f46' : al.nota_trimestral >= 5 ? '#92400e' : '#991b1b'}">
                            ${al.nota_trimestral !== null ? al.nota_trimestral : '—'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _acadEliminarNota(notaId) {
    if (!confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;
    try {
        await api(`/api/academico/notas/${notaId}`, { method: 'DELETE' });
        showAlert('ok', 'Nota eliminada');
        document.getElementById('acad-ov-det')?.remove();
        await _acadPaso3Notas();
    } catch (err) {
        showAlert('bad', err.message || 'Error al eliminar.');
    }
}

/* ----------------------------------------------------------
   REPORTE ANUAL DEL CURSO
   ---------------------------------------------------------- */
async function _acadVerReporteAnual() {
    const cont = document.getElementById('contenedor-academico');
    cont.innerHTML = '<div class="acad-empty">⏳ Generando reporte anual…</div>';
    try {
        // Obtener matrículas del curso
        const resumen = await api(
            `/api/academico/resumen-curso?curso_id=${_ac.curso.id}&paralelo_id=${_ac.paralelo.id}&periodo_id=${_ac.periodo.id}`
        );

        if (!resumen.length) {
            cont.innerHTML = `
                ${_acadBreadcrumb([
                    { label: 'Cursos', fn: '_acadPaso1Curso()' },
                    { label: _ac.curso.nombre, fn: `_acadSelCurso(${_ac.curso.id},'${_ac.curso.nombre}')` },
                    { label: `Paralelo ${_ac.paralelo.nombre}`, fn: '_acadPaso2Materias()' },
                    { label: 'Reporte anual' },
                ])}
                <div class="acad-empty">📭 No hay alumnos matriculados en este curso.</div>`;
            return;
        }

        // Cargar reporte por alumno
        const reportes = await Promise.all(
            resumen.map(al =>
                api(`/api/academico/reporte/${al.matricula_id}`).catch(() => null)
            )
        );

        const chip = (v) => {
            if (v === null || v === undefined) return `<span class="nota-chip n">—</span>`;
            const cls = v >= 7 ? 'a' : v >= 5 ? 'm' : 'b';
            return `<span class="nota-chip ${cls}">${v}</span>`;
        };

        cont.innerHTML = `
            <div class="acad-topbar">
                <h3>📊 Reporte Anual — ${_ac.curso.nombre} · Paralelo ${_ac.paralelo.nombre}</h3>
            </div>
            ${_acadBreadcrumb([
                { label: 'Cursos', fn: '_acadPaso1Curso()' },
                { label: _ac.curso.nombre, fn: `_acadSelCurso(${_ac.curso.id},'${_ac.curso.nombre}')` },
                { label: `Paralelo ${_ac.paralelo.nombre}`, fn: '_acadPaso2Materias()' },
                { label: 'Reporte anual' },
            ])}
            ${resumen.map((al, i) => {
                const rep = reportes[i];
                if (!rep) return '';
                return `
                <div class="card" style="margin-bottom:1rem">
                    <div style="display:flex;align-items:center;justify-content:space-between;
                                margin-bottom:10px">
                        <div>
                            <strong style="text-transform:uppercase;font-size:15px">
                                ${al.apellidos_est}, ${al.nombres_est}
                            </strong>
                            <span style="font-size:12px;color:var(--muted);margin-left:8px">
                                ${al.cedula_est}
                            </span>
                        </div>
                    </div>
                    <div class="acad-reporte-grid">
                        ${rep.materias.map(mat => `
                            <div class="acad-mat-card">
                                <h4>📖 ${mat.materia}</h4>
                                ${_ac.trimestres.map(t => {
                                    const trim = mat.trimestres[t.numero];
                                    return `
                                    <div class="acad-trim-row">
                                        <span style="color:var(--muted)">${t.nombre}</span>
                                        ${chip(trim?.nota_trimestral)}
                                    </div>`;
                                }).join('')}
                                <div style="margin-top:8px;padding-top:6px;
                                            border-top:1px solid var(--stroke);
                                            display:flex;justify-content:space-between;
                                            align-items:center">
                                    <span style="font-size:11px;color:var(--muted);font-weight:700">
                                        PROMEDIO ANUAL
                                    </span>
                                    ${chip(mat.promedio_anual)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }).join('')}
        `;
    } catch (err) {
        cont.innerHTML = `<div class="acad-empty">⚠️ Error al generar el reporte.<br><small>${err.message}</small></div>`;
    }
}

/* ----------------------------------------------------------
   EXPONER AL ÁMBITO GLOBAL
   ---------------------------------------------------------- */
window.mostrarModuloAcademico = mostrarModuloAcademico;
window._acadPaso1Curso        = _acadPaso1Curso;
window._acadPaso2Materias     = _acadPaso2Materias;
window._acadSelCurso          = _acadSelCurso;
window._acadSelParalelo       = _acadSelParalelo;
window._acadSelAsignacion     = _acadSelAsignacion;
window._acadCambiarTrimestre  = _acadCambiarTrimestre;
window._acadGuardarNota       = _acadGuardarNota;
window._acadAbrirModalNota    = _acadAbrirModalNota;
window._acadConfirmarNota     = _acadConfirmarNota;
window._acadVerDetalle        = _acadVerDetalle;
window._acadEliminarNota      = _acadEliminarNota;
window._acadVerReporteAnual   = _acadVerReporteAnual;
window._acadCambiarSeccion    = _acadCambiarSeccion;
window._acadCambiarAsignacionNueva = _acadCambiarAsignacionNueva;
window._acadCambiarTrimestreNuevo = _acadCambiarTrimestreNuevo;
window._acadCrearParcialNuevo = _acadCrearParcialNuevo;
window._acadCrearInsumoNuevo = _acadCrearInsumoNuevo;
window._acadGuardarNotaInsumoNuevo = _acadGuardarNotaInsumoNuevo;
window._acadGuardarExamenNuevo = _acadGuardarExamenNuevo;
window._acadCambiarEstadoParcialNuevo = _acadCambiarEstadoParcialNuevo;
window._acadNotaUnicaParcialNuevo = _acadNotaUnicaParcialNuevo;
window._acadNotaUnicaExamenNuevo = _acadNotaUnicaExamenNuevo;
window._acadEliminarInsumoNuevo = _acadEliminarInsumoNuevo;
