/* ========================================================
   MÓDULO DE ESTUDIANTES - COLEGIO MIGUEL FEBRES CORDERO
   ✅ REDISEÑADO COMPLETO:
      - Vista en tarjetas (cards) con foto carnet
      - Ficha completa en modal elegante
      - Formulario de matrícula con zona de foto carnet
        (recorte automático 3×4 con canvas)
      - Foto guardada en localStorage → aparece en PDF
      - Búsqueda en tiempo real
   ======================================================== */

/* ----------------------------------------------------------
   ESTILOS DEL MÓDULO (inyectados una sola vez)
   ---------------------------------------------------------- */
(function inyectarEstilos() {
    if (document.getElementById('est-styles')) return;
    const s = document.createElement('style');
    s.id = 'est-styles';
    s.textContent = `
    /* ── Grid de tarjetas ── */
    .est-topbar {
        display: flex; align-items: center;
        justify-content: space-between; gap: 12px;
        flex-wrap: wrap; margin-bottom: 1.5rem;
    }
    .est-topbar h3 { font-size: 18px; font-weight: 700; margin: 0; }
    .est-topbar-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .est-badge-count {
        background: #e8f1fb; color: #1a5fa8;
        font-size: 12px; padding: 4px 12px;
        border-radius: 999px; font-weight: 600;
    }
    .est-search {
        position: relative;
    }
    .est-search input {
        padding: 8px 12px 8px 34px;
        border: 1px solid var(--stroke);
        border-radius: 12px;
        background: var(--panel);
        color: var(--txt);
        font-size: 14px;
        width: 230px;
        transition: .2s;
    }
    .est-search input:focus { outline: none; border-color: #2563eb; }
    .est-search-icon {
        position: absolute; left: 10px;
        top: 50%; transform: translateY(-50%);
        color: var(--muted); font-size: 15px; pointer-events: none;
    }
    .est-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        gap: 14px;
    }
    .est-card {
        background: var(--panel);
        border: 1px solid var(--stroke);
        border-radius: 18px;
        padding: 1.1rem 1rem 0.9rem;
        display: flex; flex-direction: column;
        align-items: center; gap: 8px;
        cursor: pointer;
        transition: transform .15s, box-shadow .15s, border-color .15s;
        position: relative;
    }
    .est-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(37,99,235,.10);
        border-color: #2563eb;
    }
    .est-dot {
        position: absolute; top: 12px; right: 12px;
        width: 9px; height: 9px; border-radius: 50%;
    }
    .est-dot.activo  { background: #10b981; }
    .est-dot.inactivo{ background: #94a3b8; }
    .est-foto-wrap {
        width: 76px; height: 95px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--stroke);
        background: var(--panel2);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
    }
    .est-foto-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .est-iniciales {
        font-size: 26px; font-weight: 800;
        color: #2563eb; user-select: none;
    }
    .est-nombre {
        font-size: 13px; font-weight: 700;
        text-align: center; color: var(--txt);
        line-height: 1.3; text-transform: uppercase;
    }
    .est-cedula { font-size: 11px; color: var(--muted); }
    .est-curso-pill {
        font-size: 11px; font-weight: 600;
        background: #e8f1fb; color: #1a5fa8;
        padding: 3px 10px; border-radius: 999px;
    }
    .est-acciones {
        display: flex; gap: 5px; margin-top: 4px;
    }
    .est-btn-ic {
        border: 1px solid var(--stroke);
        background: transparent;
        border-radius: 10px;
        padding: 5px 9px;
        cursor: pointer;
        color: var(--muted);
        font-size: 13px;
        transition: .12s;
        line-height: 1;
    }
    .est-btn-ic:hover { background: var(--panel2); color: var(--txt); }
    .est-btn-ic.pdf { color: #ef4444; }
    .est-btn-ic.pdf:hover { background: #fef2f2; }
    .est-empty {
        grid-column: 1 / -1;
        text-align: center; padding: 3rem;
        color: var(--muted); font-size: 14px;
    }

    /* ── Modal genérico ── */
    .est-modal-bg {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.45);
        display: flex; align-items: center; justify-content: center;
        z-index: 1000; padding: 1rem;
    }
    .est-modal {
        background: var(--panel);
        border-radius: 22px;
        border: 1px solid var(--stroke);
        width: 100%; max-width: 780px;
        max-height: 90vh; overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,.15);
    }
    .est-modal-hdr {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--stroke);
        display: flex; align-items: center; justify-content: space-between;
        position: sticky; top: 0; background: var(--panel); z-index: 1;
        border-radius: 22px 22px 0 0;
    }
    .est-modal-hdr h3 { font-size: 16px; font-weight: 700; margin: 0; }
    .est-btn-cerrar {
        border: none; background: transparent;
        cursor: pointer; color: var(--muted);
        font-size: 22px; line-height: 1; padding: 2px 6px;
        border-radius: 8px; transition: .12s;
    }
    .est-btn-cerrar:hover { background: var(--panel2); color: var(--txt); }
    .est-modal-body { padding: 1.5rem; }
    .est-modal-ftr {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--stroke);
        display: flex; justify-content: flex-end; gap: 8px;
    }
    .est-btn-cancel {
        border: 1px solid var(--stroke);
        background: transparent; padding: 8px 18px;
        border-radius: 12px; cursor: pointer;
        color: var(--txt); font-size: 14px; transition: .12s;
    }
    .est-btn-cancel:hover { background: var(--panel2); }
    .est-btn-save {
        background: #1a5fa8; color: #fff;
        border: none; padding: 8px 22px;
        border-radius: 12px; cursor: pointer;
        font-size: 14px; font-weight: 700;
        display: flex; align-items: center; gap: 6px;
        transition: .12s;
    }
    .est-btn-save:hover { background: #145090; }
    .est-btn-pdf {
        background: #dc2626; color: #fff;
        border: none; padding: 8px 18px;
        border-radius: 12px; cursor: pointer;
        font-size: 14px; font-weight: 600;
        display: flex; align-items: center; gap: 6px;
        transition: .12s;
    }
    .est-btn-pdf:hover { background: #b91c1c; }

    /* ── Formulario ── */
    .est-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .est-form-full { grid-column: 1 / -1; }
    .est-form-group { display: flex; flex-direction: column; gap: 4px; }
    .est-form-group label {
        font-size: 12px; color: var(--muted);
        font-weight: 600; letter-spacing: .3px;
    }
    .est-form-group input,
    .est-form-group select {
        padding: 8px 11px;
        border: 1px solid var(--stroke);
        border-radius: 10px;
        background: var(--panel);
        color: var(--txt); font-size: 14px;
        transition: .15s;
    }
    .est-form-group input:focus,
    .est-form-group select:focus {
        outline: none; border-color: #2563eb;
    }
    .est-section-title {
        font-size: 12px; font-weight: 700;
        color: var(--muted); letter-spacing: .5px;
        text-transform: uppercase;
        border-bottom: 1px solid var(--stroke);
        padding-bottom: 6px;
        margin-bottom: 4px;
        grid-column: 1 / -1;
    }

    /* ── Zona foto carnet ── */
    .est-foto-zone {
        grid-column: 1 / -1;
        display: flex; gap: 1rem; align-items: flex-start;
        padding: 1rem;
        background: var(--panel2);
        border-radius: 14px;
        border: 1.5px dashed var(--stroke);
        margin-bottom: 4px;
    }
    .est-foto-preview {
        width: 90px; height: 113px;
        border-radius: 8px;
        border: 1px solid var(--stroke);
        overflow: hidden;
        background: var(--panel);
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        position: relative;
    }
    .est-foto-preview img { width:100%; height:100%; object-fit:cover; display:none; }
    .est-foto-ph {
        display: flex; flex-direction: column;
        align-items: center; gap: 5px; color: var(--muted);
        font-size: 12px; text-align: center;
    }
    .est-foto-ph span { font-size: 28px; }
    .est-foto-info p {
        font-size: 13px; font-weight: 700;
        color: var(--txt); margin-bottom: 5px;
    }
    .est-foto-info small {
        font-size: 12px; color: var(--muted);
        line-height: 1.5; display: block; margin-bottom: 10px;
    }
    .est-btn-upload {
        display: inline-flex; align-items: center; gap: 6px;
        border: 1px solid var(--stroke);
        background: var(--panel); padding: 7px 14px;
        border-radius: 10px; cursor: pointer;
        font-size: 13px; color: var(--txt);
        font-weight: 600; transition: .12s;
    }
    .est-btn-upload:hover { background: var(--panel2); }

    /* ── Ficha completa ── */
    .est-ficha-top {
        display: flex; gap: 1.25rem;
        align-items: flex-start; margin-bottom: 1.25rem;
    }
    .est-ficha-foto {
        width: 96px; height: 120px;
        border-radius: 10px; border: 1px solid var(--stroke);
        overflow: hidden; background: var(--panel2);
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
    }
    .est-ficha-foto img { width:100%; height:100%; object-fit:cover; }
    .est-ficha-datos h3 {
        font-size: 18px; font-weight: 800;
        text-transform: uppercase; margin-bottom: 3px;
    }
    .est-ficha-cedula { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
    .est-chip {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 12px; font-weight: 700;
        padding: 4px 12px; border-radius: 999px;
    }
    .est-chip.activo   { background: #d1fae5; color: #065f46; }
    .est-chip.inactivo { background: #f1efe8; color: #5f5e5a; }
    .est-ficha-grid {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 10px; margin-bottom: 1rem;
    }
    .est-ficha-campo { font-size: 13px; color: var(--muted); }
    .est-ficha-campo span {
        display: block; color: var(--txt);
        font-weight: 700; margin-top: 1px;
    }
    .est-sep {
        height: 1px; background: var(--stroke);
        margin: 1rem 0;
    }
    .est-sec-lbl {
        font-size: 11px; font-weight: 700;
        color: var(--muted); letter-spacing: .6px;
        text-transform: uppercase; margin-bottom: 10px;
    }
    `;
    document.head.appendChild(s);
})();

/* ----------------------------------------------------------
   ESTADO GLOBAL DEL MÓDULO
   ---------------------------------------------------------- */
let _fotoCarnetBase64 = null; // foto recortada lista para guardar
let _editandoId       = null; // null = nuevo, número = editar

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#39;');
}

/* ----------------------------------------------------------
   PUNTO DE ENTRADA: llamado desde el menú
   ---------------------------------------------------------- */
async function mostrarModuloEstudiantes() {
    document.getElementById('pageTitle').textContent    = "Estudiantes";
    document.getElementById('pageSubtitle').textContent = "Base de datos completa del colegio";

    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    document.getElementById('view-estudiantes').hidden = false;

    const contenedor = document.getElementById('contenedor-estudiantes-global');
    contenedor.innerHTML = `
        <div class="card">
            <div class="est-topbar">
                <div style="display:flex;align-items:center;gap:10px">
                    <h3>Alumnos Matriculados</h3>
                    <span class="est-badge-count" id="estTotal">—</span>
                </div>
                <div class="est-topbar-right">
                    <div class="est-search">
                        <span class="est-search-icon">🔍</span>
                        <input type="text" id="estBuscar"
                               placeholder="Buscar nombre o cédula…"
                               oninput="filtrarEstudiantes()">
                    </div>
                    <button class="btn" onclick="abrirFormNuevo()"
                            style="border-radius:12px;padding:8px 16px;font-size:14px">
                        ✨ Nueva matrícula
                    </button>
                </div>
            </div>
            <div class="est-grid" id="estGrid">
                <div class="est-empty">⏳ Cargando alumnos…</div>
            </div>
        </div>

        <!-- Modal formulario matrícula -->
        <div class="est-modal-bg" id="estModalForm" style="display:none">
            <div class="est-modal">
                <div class="est-modal-hdr">
                    <h3 id="estFormTitulo">Nueva matrícula</h3>
                    <button class="est-btn-cerrar" onclick="cerrarEstModal('estModalForm')"
                            aria-label="Cerrar">✕</button>
                </div>
                <div class="est-modal-body">
                    <div class="est-form-grid">

                        <div class="est-section-title">📷 Foto carnet del alumno</div>
                        <div class="est-foto-zone">
                            <div class="est-foto-preview" id="estFotoPreview">
                                <div class="est-foto-ph" id="estFotoPH">
                                    <span>👤</span>Sin foto
                                </div>
                                <img id="estFotoImg" alt="Foto carnet">
                            </div>
                            <div class="est-foto-info">
                                <p>Foto tamaño carnet (automático)</p>
                                <small>
                                    Sube cualquier foto. El sistema la recorta automáticamente
                                    al formato carnet 3×4. Esta foto aparecerá en el
                                    certificado de matrícula PDF en la esquina superior derecha.
                                </small>
                                <label class="est-btn-upload">
                                    📂 Seleccionar foto
                                    <input type="file" id="estInputFoto" accept="image/*"
                                           style="display:none"
                                           onchange="estProcesarFoto(this)">
                                </label>
                                <canvas id="estCanvas" style="display:none"
                                        width="354" height="472"></canvas>
                            </div>
                        </div>

                        <div class="est-section-title" style="margin-top:4px">
                            🎓 Datos del estudiante
                        </div>
                        <div class="est-form-group">
                            <label>Cédula</label>
                            <input type="text" id="ef_cedula" maxlength="10"
                                   placeholder="0912345678">
                        </div>
                        <div class="est-form-group">
                            <label>Fecha de nacimiento</label>
                            <input type="date" id="ef_fecha_nac">
                        </div>
                        <div class="est-form-group">
                            <label>Nombres</label>
                            <input type="text" id="ef_nombres" placeholder="Ej: María José">
                        </div>
                        <div class="est-form-group">
                            <label>Apellidos</label>
                            <input type="text" id="ef_apellidos" placeholder="Ej: García Pérez">
                        </div>
                        <div class="est-form-group">
                            <label>Género</label>
                            <select id="ef_genero">
                                <option value="Femenino">Femenino</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div class="est-form-group">
                            <label>Curso</label>
                            <select id="ef_curso_id">
                                <option value="">— Seleccionar —</option>
                            </select>
                        </div>

                        <div class="est-section-title" style="margin-top:4px">
                            👤 Representante
                        </div>
                        <div class="est-form-group est-form-full">
                            <label>Nombre completo del representante</label>
                            <input type="text" id="ef_nombre_rep"
                                   placeholder="Ej: Juan García Flores">
                        </div>
                        <div class="est-form-group">
                            <label>Cédula representante</label>
                            <input type="text" id="ef_cedula_rep" maxlength="10"
                                   placeholder="0912345678">
                        </div>
                        <div class="est-form-group">
                            <label>Celular</label>
                            <input type="tel" id="ef_celular_rep"
                                   placeholder="0991234567">
                        </div>
                        <div class="est-form-group">
                            <label>Parentesco</label>
                            <select id="ef_parentesco">
                                <option value="Madre">Madre</option>
                                <option value="Padre">Padre</option>
                                <option value="Tutor">Tutor Legal</option>
                            </select>
                        </div>
                        <div class="est-form-group">
                            <label>Sector / Barrio</label>
                            <input type="text" id="ef_sector"
                                   placeholder="Ej: Guasmo Sur">
                        </div>
                        <div class="est-form-group est-form-full">
                            <label>Dirección</label>
                            <input type="text" id="ef_direccion"
                                   placeholder="Ej: Calle 10 y Av. Principal">
                        </div>
                    </div>
                </div>
                <div class="est-modal-ftr">
                    <button class="est-btn-cancel"
                            onclick="cerrarEstModal('estModalForm')">Cancelar</button>
                    <button class="est-btn-save" onclick="guardarMatricula()">
                        ✅ Confirmar cambio
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal ficha completa -->
        <div class="est-modal-bg" id="estModalFicha" style="display:none">
            <div class="est-modal" style="max-width:640px">
                <div class="est-modal-hdr">
                    <h3>Ficha del alumno</h3>
                    <button class="est-btn-cerrar" onclick="cerrarEstModal('estModalFicha')"
                            aria-label="Cerrar">✕</button>
                </div>
                <div class="est-modal-body" id="estFichaBody"></div>
            </div>
        </div>
    `;

    // Cargar cursos en el select
    await estCargarCursos();
    // Cargar alumnos
    await listarEstudiantesGlobal();
}

/* ----------------------------------------------------------
   Cargar opciones de cursos desde la API
   ---------------------------------------------------------- */
async function estCargarCursos() {
    try {
        const cursos = await api('/api/admin/cursos/estadisticas');
        const sel = document.getElementById('ef_curso_id');
        if (!sel || !cursos) return;
        cursos.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nombre;
            sel.appendChild(opt);
        });
    } catch {
        // Si falla, deja el select vacío — no bloquea el formulario
    }
}

/* ----------------------------------------------------------
   Listar estudiantes → renderizar grid
   ---------------------------------------------------------- */
async function listarEstudiantesGlobal() {
    try {
        const estudiantes = await api('/api/students');
        _renderGrid(estudiantes);
    } catch (err) {
        const grid = document.getElementById('estGrid');
        if (grid) grid.innerHTML =
            '<div class="est-empty">⚠️ Error al conectar con el servidor.</div>';
    }
}

function _renderGrid(lista) {
    const grid  = document.getElementById('estGrid');
    const badge = document.getElementById('estTotal');
    if (!grid) return;

    if (badge) badge.textContent = `${lista.length} alumno${lista.length !== 1 ? 's' : ''}`;

    if (!lista.length) {
        grid.innerHTML = '<div class="est-empty">📭 No se encontraron alumnos.</div>';
        return;
    }

    grid.innerHTML = lista.map(est => {
        const ini    = (est.apellidos_est?.[0] || '') + (est.nombres_est?.[0] || '');
        const activo = est.estado === 'ACTIVO';
        const foto   = cargarFotoEstudiante ? cargarFotoEstudiante(est.id) : null;

        const nombreSeguro = escapeHTML(est.nombres_est);
        const apellidoSeguro = escapeHTML(est.apellidos_est);
        const cedulaSegura = escapeHTML(est.cedula_est);
        const cursoSeguro = escapeHTML(est.nombre_curso || '—');

        return `
        <div class="est-card" onclick="verFichaEstudiante(${est.id})">
            <div class="est-dot ${activo ? 'activo' : 'inactivo'}"
                 title="${activo ? 'Activo' : 'Inactivo'}"></div>
            <div class="est-foto-wrap">
                ${foto
                    ? `<img src="${foto}" alt="Foto de ${nombreSeguro}">`
                    : `<span class="est-iniciales">${escapeHTML(ini)}</span>`}
            </div>
            <div class="est-nombre">${apellidoSeguro},<br>${nombreSeguro}</div>
            <div class="est-cedula">${cedulaSegura}</div>
            <div class="est-curso-pill">${cursoSeguro}</div>
            <div class="est-acciones">
                <button class="est-btn-ic"
                        onclick="event.stopPropagation();verFichaEstudiante(${est.id})"
                        title="Ver ficha" aria-label="Ver ficha">👁️</button>
                <button class="est-btn-ic"
                        onclick="event.stopPropagation();abrirFormEditar(${est.id})"
                        title="Editar" aria-label="Editar">✏️</button>
                <button class="est-btn-ic pdf"
                        onclick="event.stopPropagation();generarCertificadoMatricula(${est.id},'${est.nombre_curso || ''}')"
                        ${!activo ? 'disabled title="Solo alumnos activos"' : 'title="Certificado PDF"'}
                        aria-label="Generar PDF">📄</button>
            </div>
        </div>`;
    }).join('');
}

/* ----------------------------------------------------------
   Búsqueda en tiempo real (filtra sin nueva petición al server)
   ---------------------------------------------------------- */
let _todosLosAlumnos = [];

async function filtrarEstudiantes() {
    if (!_todosLosAlumnos.length) {
        try { _todosLosAlumnos = await api('/api/students'); } catch { return; }
    }
    const q = (document.getElementById('estBuscar')?.value || '').toLowerCase();
    const filtrados = _todosLosAlumnos.filter(a =>
        (a.nombres_est + ' ' + a.apellidos_est + ' ' + a.cedula_est).toLowerCase().includes(q)
    );
    _renderGrid(filtrados);
}

// Sobreescribir listarEstudiantesGlobal para actualizar caché
const _listarOriginal = listarEstudiantesGlobal;
window.listarEstudiantesGlobal = async function () {
    try {
        _todosLosAlumnos = await api('/api/students');
        _renderGrid(_todosLosAlumnos);
    } catch (err) {
        const grid = document.getElementById('estGrid');
        if (grid) grid.innerHTML =
            '<div class="est-empty">⚠️ Error al conectar con el servidor.</div>';
    }
};

/* ----------------------------------------------------------
   Procesar foto con canvas → recorte automático 3×4 (carnet)
   ---------------------------------------------------------- */
function estProcesarFoto(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.getElementById('estCanvas');
            const ctx    = canvas.getContext('2d');
            const W = 354, H = 472; // proporción 3:4 a alta resolución
            canvas.width  = W;
            canvas.height = H;

            // Recorte centrado manteniendo proporción carnet
            const srcRatio = img.width / img.height;
            const tgtRatio = W / H;
            let sx, sy, sw, sh;
            if (srcRatio > tgtRatio) {
                sw = img.height * tgtRatio; sh = img.height;
                sx = (img.width - sw) / 2;  sy = 0;
            } else {
                sw = img.width; sh = img.width / tgtRatio;
                sx = 0;         sy = (img.height - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
            _fotoCarnetBase64 = canvas.toDataURL('image/jpeg', 0.92);

            // Previsualización
            const imgEl = document.getElementById('estFotoImg');
            imgEl.src   = _fotoCarnetBase64;
            imgEl.style.display = 'block';
            document.getElementById('estFotoPH').style.display = 'none';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/* ----------------------------------------------------------
   Abrir formulario NUEVO
   ---------------------------------------------------------- */
function abrirFormNuevo() {
    _editandoId       = null;
    _fotoCarnetBase64 = null;
    document.getElementById('estFormTitulo').textContent = 'Nueva matrícula';
    _limpiarFormulario();
    document.getElementById('estModalForm').style.display = 'flex';
}

/* ----------------------------------------------------------
   Abrir formulario EDITAR
   ---------------------------------------------------------- */
async function abrirFormEditar(id) {
    try {
        const est = await api(`/api/students/${id}`);
        _editandoId = id;
        _fotoCarnetBase64 = cargarFotoEstudiante ? cargarFotoEstudiante(id) : null;

        document.getElementById('estFormTitulo').textContent = 'Editar ficha del alumno';
        document.getElementById('ef_cedula').value     = est.cedula_est    || '';
        document.getElementById('ef_nombres').value    = est.nombres_est   || '';
        document.getElementById('ef_apellidos').value  = est.apellidos_est || '';
        document.getElementById('ef_fecha_nac').value  = est.fecha_nac     || '';
        document.getElementById('ef_genero').value     = est.genero        || 'Femenino';
        document.getElementById('ef_curso_id').value   = est.curso_id      || '';
        document.getElementById('ef_nombre_rep').value = est.nombre_rep    || '';
        document.getElementById('ef_cedula_rep').value = est.cedula_rep    || '';
        document.getElementById('ef_celular_rep').value= est.celular_rep   || '';
        document.getElementById('ef_parentesco').value = est.parentesco_rep|| 'Madre';
        document.getElementById('ef_sector').value     = est.sector        || '';
        document.getElementById('ef_direccion').value  = est.direccion     || '';

        // Foto
        if (_fotoCarnetBase64) {
            const imgEl = document.getElementById('estFotoImg');
            imgEl.src = _fotoCarnetBase64;
            imgEl.style.display = 'block';
            document.getElementById('estFotoPH').style.display = 'none';
        } else {
            document.getElementById('estFotoImg').style.display = 'none';
            document.getElementById('estFotoPH').style.display  = 'flex';
        }

        document.getElementById('estModalForm').style.display = 'flex';
    } catch (err) {
        showAlert('bad', 'Error al cargar los datos del alumno.');
    }
}

function _limpiarFormulario() {
    ['cedula','fecha_nac','nombres','apellidos','nombre_rep','cedula_rep','celular_rep','sector','direccion']
        .forEach(f => { const el = document.getElementById('ef_'+f); if(el) el.value = ''; });
    document.getElementById('estFotoImg').style.display = 'none';
    document.getElementById('estFotoPH').style.display  = 'flex';
    document.getElementById('estInputFoto').value       = '';
}

/* ----------------------------------------------------------
   Guardar matrícula (nuevo o edición)
   ---------------------------------------------------------- */
async function guardarMatricula() {
    const cedula    = document.getElementById('ef_cedula').value.trim();
    const nombres   = document.getElementById('ef_nombres').value.trim();
    const apellidos = document.getElementById('ef_apellidos').value.trim();
    const curso_id  = document.getElementById('ef_curso_id').value;

    if (!cedula || !nombres || !apellidos) {
        showAlert('bad', 'Cédula, nombres y apellidos son obligatorios.');
        return;
    }
    if (!/^\d{10}$/.test(cedula)) {
        showAlert('bad', 'La cédula debe tener exactamente 10 dígitos.');
        return;
    }

    const cedulaRep = document.getElementById('ef_cedula_rep').value.trim();
    if (cedulaRep && !/^\d{10}$/.test(cedulaRep)) {
        showAlert('bad', 'La cédula del representante debe tener 10 dígitos.');
        return;
    }

    const fechaNac = document.getElementById('ef_fecha_nac').value;
    if (fechaNac && new Date(fechaNac) > new Date()) {
        showAlert('bad', 'La fecha de nacimiento no puede ser futura.');
        return;
    }

    const payload = {
        cedula_est:     cedula,
        nombres_est:    nombres,
        apellidos_est:  apellidos,
        fecha_nac:      fechaNac,
        genero:         document.getElementById('ef_genero').value,
        curso_id:       curso_id || null,
        nombre_rep:     document.getElementById('ef_nombre_rep').value.trim(),
        cedula_rep:     cedulaRep,
        celular_rep:    document.getElementById('ef_celular_rep').value.trim(),
        parentesco_rep: document.getElementById('ef_parentesco').value,
        sector:         document.getElementById('ef_sector').value.trim(),
        direccion:      document.getElementById('ef_direccion').value.trim(),
    };

    try {
        if (_editandoId) {
            await api(`/api/students/${_editandoId}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
            // Guardar foto actualizada
            if (_fotoCarnetBase64 && typeof guardarFotoEstudiante === 'function') {
                guardarFotoEstudiante(_editandoId, _fotoCarnetBase64);
            }
            showAlert('ok', 'Ficha actualizada correctamente ✅');
        } else {
            const res = await api('/api/students', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            // Guardar foto del nuevo alumno
            if (_fotoCarnetBase64 && res.id && typeof guardarFotoEstudiante === 'function') {
                guardarFotoEstudiante(res.id, _fotoCarnetBase64);
            }
            showAlert('ok', '¡Matrícula registrada con éxito! ✅');
        }
        cerrarEstModal('estModalForm');
        _todosLosAlumnos = []; // limpiar caché para recargar
        await listarEstudiantesGlobal();
    } catch (err) {
        showAlert('bad', err.message || 'Error al guardar. Intenta de nuevo.');
    }
}

/* ----------------------------------------------------------
   Ver ficha completa en modal
   ---------------------------------------------------------- */
async function verFichaEstudiante(id) {
    try {
        const est  = await api(`/api/students/${id}`);
        const foto = cargarFotoEstudiante ? cargarFotoEstudiante(id) : null;
        const ini  = (est.apellidos_est?.[0] || '') + (est.nombres_est?.[0] || '');
        const fnac = est.fecha_nac
            ? new Date(est.fecha_nac + 'T12:00:00')
                .toLocaleDateString('es-EC', { day:'2-digit', month:'long', year:'numeric' })
            : 'No registrada';
        const activo = est.estado === 'ACTIVO';

        document.getElementById('estFichaBody').innerHTML = `
            <div class="est-ficha-top">
                <div class="est-ficha-foto">
                    ${foto
                        ? `<img src="${foto}" alt="Foto de ${est.nombres_est}">`
                        : `<span style="font-size:34px;font-weight:800;color:#2563eb">${ini}</span>`}
                </div>
                <div class="est-ficha-datos">
                    <h3>${est.apellidos_est} ${est.nombres_est}</h3>
                    <div class="est-ficha-cedula">CI: ${est.cedula_est}</div>
                    <span class="est-chip ${activo ? 'activo' : 'inactivo'}">
                        ● ${activo ? 'Matriculado' : 'Inactivo'}
                    </span>
                </div>
            </div>

            <div class="est-sec-lbl">Datos académicos</div>
            <div class="est-ficha-grid">
                <div class="est-ficha-campo">Curso<span>${est.nombre_curso || '—'}</span></div>
                <div class="est-ficha-campo">Género<span>${est.genero || '—'}</span></div>
                <div class="est-ficha-campo">Fecha de nacimiento<span>${fnac}</span></div>
                <div class="est-ficha-campo">Sector<span>${est.sector || '—'}</span></div>
                <div class="est-ficha-campo" style="grid-column:1/-1">
                    Dirección<span>${est.direccion || '—'}</span>
                </div>
            </div>

            <div class="est-sep"></div>
            <div class="est-sec-lbl">Representante</div>
            <div class="est-ficha-grid">
                <div class="est-ficha-campo">Nombre<span>${est.nombre_rep || '—'}</span></div>
                <div class="est-ficha-campo">Parentesco<span>${est.parentesco_rep || '—'}</span></div>
                <div class="est-ficha-campo">Cédula<span>${est.cedula_rep || '—'}</span></div>
                <div class="est-ficha-campo">Celular<span>${est.celular_rep || '—'}</span></div>
            </div>

            <div class="est-sep"></div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
                <button class="est-btn-cancel"
                        onclick="abrirFormEditar(${id});cerrarEstModal('estModalFicha')">
                    ✏️ Editar ficha
                </button>
                <button class="est-btn-pdf"
                        onclick="generarCertificadoMatricula(${id},'${est.nombre_curso || ''}')">
                    📄 Certificado PDF
                </button>
            </div>
        `;
        document.getElementById('estModalFicha').style.display = 'flex';
    } catch {
        showAlert('bad', 'Error al cargar la ficha del alumno.');
    }
}

function cerrarEstModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

/* ----------------------------------------------------------
   Exponer funciones globales
   ---------------------------------------------------------- */
window.mostrarModuloEstudiantes = mostrarModuloEstudiantes;
window.listarEstudiantesGlobal  = listarEstudiantesGlobal;
window.filtrarEstudiantes       = filtrarEstudiantes;
window.abrirFormNuevo           = abrirFormNuevo;
window.abrirFormEditar          = abrirFormEditar;
window.guardarMatricula         = guardarMatricula;
window.verFichaEstudiante       = verFichaEstudiante;
window.estProcesarFoto          = estProcesarFoto;
window.cerrarEstModal           = cerrarEstModal;

// Alias de compatibilidad con botones existentes en app.html
window.verFichaCompleta         = verFichaEstudiante;
window.prepararEdicion          = abrirFormEditar;