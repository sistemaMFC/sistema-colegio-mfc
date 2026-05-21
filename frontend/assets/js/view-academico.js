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
    // selección actual
    curso:      null,
    paralelo:   null,
    asignacion: null,   // { id, materia, curso, paralelo, ... }
    trimestre:  null,   // { id, nombre, numero }
    dataNota:   null,   // última respuesta del GET /notas
};

/* ----------------------------------------------------------
   PUNTO DE ENTRADA
   ---------------------------------------------------------- */
async function mostrarModuloAcademico() {
    document.getElementById('pageTitle').textContent    = 'Académico';
    document.getElementById('pageSubtitle').textContent = 'Calificaciones · Trimestres · Materias';
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

        _acadPaso1Curso();
    } catch (err) {
        cont.innerHTML = `<div class="acad-empty">⚠️ Error al inicializar el módulo académico.<br><small>${err.message}</small></div>`;
    }
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
function _acadPaso1Curso() {
    const cont = document.getElementById('contenedor-academico');
    cont.innerHTML = `
        <div class="acad-topbar">
            <h3>Académico</h3>
        </div>
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