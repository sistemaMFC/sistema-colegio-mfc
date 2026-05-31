/* ========================================================
    LÓGICA DE VISUALIZACIÓN DE CURSOS - COLEGIO MFC
    ACTUALIZACIÓN: LISTADO NUMERADO, ELIMINACIÓN Y CERTIFICADOS
   ======================================================== */

// Variables globales para el contexto de la matrícula
let cursoActualId = null;
let cursoActualNombre = "";
let bsSelectorModal = null; // Instancia del modal de Bootstrap
let paralelosMatriculaCache = [];
let periodoMatriculaActivo = null;
let paraleloAsignacionActual = "";
let alumnosCursoCache = [];  // Caché para búsqueda rápida y filtrado local

// --- ORDEN LÓGICO PARA VALIDACIÓN ---
const ORDEN_CURSOS = [
    "Inicial I", "Inicial II", "Primero de Educación General Básica", "Segundo de Educación General Básica",
    "Tercero de Educación General Básica", "Cuarto de Educación General Básica",
    "Quinto de Educación General Básica", "Sexto de Educación General Básica",
    "Séptimo de Educación General Básica", "Octavo de Educación General Básica",
    "Noveno de Educación General Básica", "Décimo de Educación General Básica"
];

function normalizarNombreCurso(nombre) {
    const raw = String(nombre || "").trim();
    if (!raw) return "Curso no definido";

    const canon = raw
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const mapaDirecto = {
        "INICIAL 1": "Inicial I",
        "INICIAL I": "Inicial I",
        "INICIAL 2": "Inicial II",
        "INICIAL II": "Inicial II",
        "1RO DE BASICA": "Primero de Educación General Básica",
        "1RO BASICA": "Primero de Educación General Básica",
        "PRIMERO EGB": "Primero de Educación General Básica",
        "2DO DE BASICA": "Segundo de Educación General Básica",
        "2DO BASICA": "Segundo de Educación General Básica",
        "SEGUNDO EGB": "Segundo de Educación General Básica",
        "3RO DE BASICA": "Tercero de Educación General Básica",
        "3RO BASICA": "Tercero de Educación General Básica",
        "TERCERO EGB": "Tercero de Educación General Básica",
        "4TO DE BASICA": "Cuarto de Educación General Básica",
        "4TO BASICA": "Cuarto de Educación General Básica",
        "4RO DE BASICA": "Cuarto de Educación General Básica",
        "4RO BASICA": "Cuarto de Educación General Básica",
        "CUARTO EGB": "Cuarto de Educación General Básica",
        "5TO DE BASICA": "Quinto de Educación General Básica",
        "5TO BASICA": "Quinto de Educación General Básica",
        "QUINTO EGB": "Quinto de Educación General Básica",
        "6TO DE BASICA": "Sexto de Educación General Básica",
        "6TO BASICA": "Sexto de Educación General Básica",
        "SEXTO EGB": "Sexto de Educación General Básica",
        "7MO DE BASICA": "Séptimo de Educación General Básica",
        "7MO BASICA": "Séptimo de Educación General Básica",
        "SEPTIMO EGB": "Séptimo de Educación General Básica",
        "8VO DE BASICA": "Octavo de Educación General Básica",
        "8VO BASICA": "Octavo de Educación General Básica",
        "OCTAVO EGB": "Octavo de Educación General Básica",
        "9NO DE BASICA": "Noveno de Educación General Básica",
        "9NO BASICA": "Noveno de Educación General Básica",
        "NOVENO EGB": "Noveno de Educación General Básica",
        "10MO DE BASICA": "Décimo de Educación General Básica",
        "10MO BASICA": "Décimo de Educación General Básica",
        "DECIMO EGB": "Décimo de Educación General Básica"
    };

    return mapaDirecto[canon] || raw;
}

/**
 * 1. RENDERIZAR TARJETAS DE CURSOS
 */
async function renderizarCursos() {
    const contenedor = document.querySelector('.grid-cursos-mfc');
    if (!contenedor) return;

    try {
        const respuesta = await api('/api/admin/cursos/estadisticas');
        const cursos = Array.isArray(respuesta) ? respuesta : [];

        contenedor.innerHTML = "";

        if (cursos.length === 0) {
            contenedor.innerHTML = `<p class="muted">No hay cursos registrados en el sistema.</p>`;
            return;
        }

        cursos.forEach((c) => {
            contenedor.innerHTML += `
                <div class="curso-card-mfc" onclick="abrirSelectorMatricula('${c.id}', '${normalizarNombreCurso(c.nombre)}')">
                    <div class="curso-numero-wrapper">
                        ${c.total_matriculados || 0}
                    </div>
                    <div class="curso-info-mfc">
                        <h3 class="curso-nombre-mfc">${normalizarNombreCurso(c.nombre)}</h3>
                        <span class="curso-detalle-mfc">Click para gestionar estudiantes</span>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error("Error al cargar cursos:", err);
        contenedor.innerHTML = `<p class="danger">Error de conexión con el servidor.</p>`;
    }
}

/* ========================================================
    2. GESTIÓN DE PRE-MATRICULADOS (LISTADO OFICIAL)
   ======================================================== */

async function listarPreMatriculados() {
    if (bsSelectorModal) bsSelectorModal.hide();
    cerrarListaActual();

    const contenedor = document.getElementById('contenedor-pre-matriculados');
    const tbody = document.getElementById('listaAlumnosFiltrados');
    const txtTitulo = document.getElementById('txtCursoLista');

    if (!contenedor || !tbody) return;

    contenedor.style.display = 'block';
    txtTitulo.textContent = `Listado Oficial: ${cursoActualNombre}`;
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>⏳ Sincronizando...</td></tr>";

    try {
        const alumnos = await api('/api/students');
        alumnosCursoCache = alumnos.filter(a => a.curso_id == cursoActualId && a.estado !== 'ACTIVO');
        renderizarTablaFiltrada(alumnosCursoCache);
        contenedor.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert("❌ No se pudo cargar el listado oficial.");
    }
}

function renderizarTablaFiltrada(lista) {
    const tbody = document.getElementById('listaAlumnosFiltrados');
    tbody.innerHTML = "";

    if (lista.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='muted' style='text-align:center;'>No hay estudiantes pendientes.</td></tr>";
        return;
    }

    lista.forEach(est => {
        tbody.innerHTML += `
            <tr>
                <td>${est.cedula_est}</td>
                <td style="font-weight:bold; text-transform:uppercase; color: var(--green);">
                    ${est.apellidos_est}, ${est.nombres_est}
                </td>
                <td><span class="badge warn">${est.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="confirmarMatriculaPre('${est.id}', '${est.apellidos_est}', '${est.nombres_est}')">
                        ✅ Matricular
                    </button>
                </td>
            </tr>
        `;
    });
}

/**
 * Matricular preguntando el curso desde un listado numerado
 */
async function confirmarMatriculaPre(id, apellidos, nombres) {
    try {
        const cursosBase = await api('/api/admin/cursos/estadisticas');
        
        let mensajeListado = `Seleccione el curso destino para:\n${apellidos} ${nombres}\n\n`;
        cursosBase.forEach((c, index) => {
            mensajeListado += `${index + 1}. ${normalizarNombreCurso(c.nombre)}\n`;
        });

        const seleccion = prompt(mensajeListado + "\nEscriba el NÚMERO del curso:");

        if (!seleccion) return;

        const indice = parseInt(seleccion) - 1;
        const cursoDestino = cursosBase[indice];

        if (!cursoDestino) {
            alert("❌ Selección inválida.");
            return;
        }

        const idxActual = ORDEN_CURSOS.indexOf(cursoActualNombre);
        const idxDestino = ORDEN_CURSOS.indexOf(normalizarNombreCurso(cursoDestino.nombre));

        if (idxDestino > idxActual + 1) {
            const pass = prompt("⚠️ SALTO DE CURSO: Ingrese la CLAVE DE SEGURIDAD para autorizar curso superior:");
            if (pass !== "SistemaMFC") {
                alert("❌ Clave incorrecta.");
                return;
            }
        }

        await api(`/api/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ 
                estado: 'ACTIVO',
                curso_id: cursoDestino.id 
            })
        });

        alert(`✨ Estudiante matriculado en ${normalizarNombreCurso(cursoDestino.nombre)}`);
        listarPreMatriculados(); 
        renderizarCursos();     
        if(window.actualizarDashboard) window.actualizarDashboard();

    } catch (err) {
        alert("❌ Error: " + err.message);
    }
}

/* ========================================================
    3. VER MATRICULADOS ACTUALES Y OPCIONES
   ======================================================== */

async function listarMatriculadosActuales() {
    if (bsSelectorModal) bsSelectorModal.hide();
    cerrarListaPre();

    const contenedor = document.getElementById('contenedor-matriculados-actuales');
    const tbody = document.getElementById('listaMatriculadosActuales');
    const txtTitulo = document.getElementById('txtCursoMatriculados');

    if (!contenedor || !tbody) return;

    contenedor.style.display = 'block';
    txtTitulo.textContent = `Matriculados: ${cursoActualNombre}`;
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>⏳ Cargando...</td></tr>";

    try {
        const alumnos = await api('/api/students');
        const inscritos = alumnos.filter(a => a.curso_id == cursoActualId && a.estado === 'ACTIVO');

        tbody.innerHTML = "";

        if (inscritos.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' class='muted' style='text-align:center;'>Sin alumnos matriculados.</td></tr>";
            return;
        }

        inscritos.forEach(est => {
            tbody.innerHTML += `
                <tr>
                    <td>${est.cedula_est}</td>
                    <td style="font-weight:bold; text-transform:uppercase;">
                        ${est.apellidos_est}, ${est.nombres_est}
                    </td>
                    <td>
                        ${est.nombre_rep || 'S/I'}<br>
                        <small class="muted">CI: ${est.cedula_rep || 'S/I'}</small>
                    </td>
                    <td><span class="badge ok">MATRICULADO</span></td>
                    <td>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                ⚙️ Opciones
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="generarCertificadoMatricula('${est.id}', '${cursoActualNombre}')">📜 Certificado</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" onclick="prepararEdicion('${est.id}')">✏️ Editar Datos</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="anularMatricula('${est.id}', '${est.apellidos_est}, ${est.nombres_est}')">🚫 Anular Matrícula</a></li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        });
        contenedor.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert("❌ Error al cargar matriculados.");
    }
}

/**
 * LOGICA PARA ANULAR MATRICULA (ELIMINACIÓN FÍSICA)
 */
async function anularMatricula(id, nombreCompleto) {
    if (!id) return;
    if (!confirm(`⚠️ ¡ATENCIÓN! ¿Está seguro de ANULAR a ${nombreCompleto}?\nEsta acción lo ELIMINARÁ definitivamente de la base de datos.`)) return;

    const password = prompt("🔐 Ingrese la CLAVE DE SEGURIDAD para confirmar la eliminación:");
    if (password !== "SistemaMFC") {
        alert("❌ Clave incorrecta. Acción cancelada.");
        return;
    }

    try {
        await api(`/api/students/${id}`, { method: 'DELETE' });
        alert("🗑️ Estudiante eliminado correctamente.");
        await renderizarCursos();
        if(window.actualizarDashboard) window.actualizarDashboard();
        cerrarListaActual();
    } catch (err) {
        alert("❌ Error: No se pudo eliminar el registro.");
    }
}

/**
 * CARGAR DATOS EN EL FORMULARIO PARA EDITAR
 */
async function prepararEdicion(id) {
    try {
        const est = await api(`/api/students/${id}`);
        document.getElementById('edit_id_estudiante').value = est.id;
        document.getElementById('field_cedula_est').value = est.cedula_est;
        document.getElementById('field_nombres_est').value = est.nombres_est;
        document.getElementById('field_apellidos_est').value = est.apellidos_est;
        document.getElementById('field_fecha_nac').value = est.fecha_nac ? est.fecha_nac.split('T')[0] : '';
        document.getElementById('field_genero').value = est.genero;
        document.getElementById('field_nombre_rep').value = est.nombre_rep;
        document.getElementById('field_cedula_rep').value = est.cedula_rep;
        document.getElementById('field_celular_rep').value = est.celular_rep;
        document.getElementById('field_parentesco_rep').value = est.parentesco_rep;
        document.getElementById('field_sector').value = est.sector;
        document.getElementById('field_direccion').value = est.direccion;

        document.getElementById('modalMatriculaTitulo').textContent = "✏️ Editar Estudiante";
        document.getElementById('modalFormMatricula').style.display = 'grid';
    } catch (err) {
        alert("❌ Error al obtener la ficha.");
    }
}

/* ========================================================
    4. FUNCIONES DE UTILIDAD (BÚSQUEDA Y CIERRES)
   ======================================================== */

function filtrarEstudiantesPre(e) {
    const texto = e.target.value.toLowerCase();
    const filtrados = alumnosCursoCache.filter(a => 
        a.apellidos_est.toLowerCase().includes(texto) || 
        a.nombres_est.toLowerCase().includes(texto) ||
        a.cedula_est.includes(texto)
    );
    renderizarTablaFiltrada(filtrados);
}

function cerrarListaPre() {
    const el = document.getElementById('contenedor-pre-matriculados');
    if (el) el.style.display = 'none';
}

function cerrarListaActual() {
    const el = document.getElementById('contenedor-matriculados-actuales');
    if (el) el.style.display = 'none';
}

async function procesarMatricula(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const idEstudiante = formData.get('id_estudiante');
    
    const datos = {
        cedula_est: formData.get('cedula_est'),
        nombres_est: formData.get('nombres_est'),
        apellidos_est: formData.get('apellidos_est'),
        fecha_nac: formData.get('fecha_nac'),
        genero: formData.get('genero'),
        nombre_rep: formData.get('nombre_rep'),
        cedula_rep: formData.get('cedula_rep'),
        parentesco_rep: formData.get('parentesco_rep'),
        celular_rep: formData.get('celular_rep'),
        sector: formData.get('sector'),
        direccion: formData.get('direccion'),
        curso_id: cursoActualId 
    };

    try {
        if (idEstudiante) {
            await api(`/api/students/${idEstudiante}`, {
                method: 'PUT',
                body: JSON.stringify(datos)
            });
            alert("✅ Información actualizada.");
        } else {
            const res = await api('/api/students', {
                method: 'POST',
                body: JSON.stringify(datos)
            });
            alert("✨ " + res.message);
        }

        cerrarFormularioMatricula();
        renderizarCursos(); 
        if(idEstudiante) listarMatriculadosActuales();
        if(window.actualizarDashboard) window.actualizarDashboard();
        
    } catch (err) {
        alert("❌ Error: " + (err.message || "Revise los datos."));
    }
}

/* ========================================================
    5. INICIALIZACIÓN Y EVENTOS
   ======================================================== */

function abrirSelectorMatricula(id, nombre) {
    cursoActualId = id;
    cursoActualNombre = nombre;
    const titulo = document.getElementById('tituloCursoSeleccionado');
    if (titulo) titulo.textContent = `Curso: ${nombre}`;

    if (!bsSelectorModal) {
        const modalEl = document.getElementById('modalSelectorBootstrap');
        if (modalEl) bsSelectorModal = new bootstrap.Modal(modalEl);
    }
    if (bsSelectorModal) bsSelectorModal.show();
}

function abrirFormularioMatriculaNueva() {
    if (bsSelectorModal) bsSelectorModal.hide();
    const form = document.getElementById('formNuevaMatricula');
    if (form) form.reset();
    
    document.getElementById('edit_id_estudiante').value = "";
    document.getElementById('modalMatriculaTitulo').textContent = "Registro de Matrícula Nueva";
    document.getElementById('modalFormMatricula').style.display = 'grid';
}

function cerrarFormularioMatricula() {
    const modalForm = document.getElementById('modalFormMatricula');
    if (modalForm) {
        modalForm.style.display = 'none';
        document.getElementById('formNuevaMatricula')?.reset();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderizarCursos();
    document.getElementById('inputBuscarEstudiante')?.addEventListener('input', filtrarEstudiantesPre);
    document.getElementById('formNuevaMatricula')?.addEventListener('submit', procesarMatricula);
    document.getElementById('btnMatriculaNueva')?.addEventListener('click', abrirFormularioMatriculaNueva);
    document.getElementById('btnMatriculaAntigua')?.addEventListener('click', listarPreMatriculados);
    document.getElementById('btnVerMatriculados')?.addEventListener('click', listarMatriculadosActuales);

    const bindToggleLista = (btnId, wrapId) => {
        const btn = document.getElementById(btnId);
        const wrap = document.getElementById(wrapId);
        if (!btn || !wrap) return;
        btn.addEventListener('click', () => {
            const isHidden = wrap.hasAttribute('hidden');
            if (isHidden) {
                wrap.removeAttribute('hidden');
                btn.textContent = 'Ocultar lista';
            } else {
                wrap.setAttribute('hidden', '');
                btn.textContent = 'Desplegar lista';
            }
        });
    };

    bindToggleLista('btnToggleCursosHabilitados', 'wrapCursosHabilitados');
    bindToggleLista('btnToggleMateriasCurso', 'wrapMateriasCurso');
    bindToggleLista('btnToggleProfesorTutor', 'wrapProfesorTutor');
    
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modalFormMatricula') cerrarFormularioMatricula();
    });
});

// Exposición global
window.renderizarCursos = renderizarCursos;
window.abrirSelectorMatricula = abrirSelectorMatricula;
window.cerrarFormularioMatricula = cerrarFormularioMatricula;
window.cerrarListaPre = cerrarListaPre;
window.cerrarListaActual = cerrarListaActual;
window.prepararEdicion = prepararEdicion;
window.anularMatricula = anularMatricula;
window.confirmarMatriculaPre = confirmarMatriculaPre; 

/* ========================================================
   ASIGNACION MANUAL OFICIAL POR CURSO Y PARALELO
   Fuente real: matriculas, no estudiantes.curso_id
   ======================================================== */

async function prepararAsignacionManualParalelo() {
    const contenedor = document.getElementById('contenedor-pre-matriculados');
    if (!contenedor) return;

    if (!paralelosMatriculaCache.length || !periodoMatriculaActivo) {
        const [cp, periodo] = await Promise.all([
            api('/api/academico/cursos-paralelos'),
            api('/api/academico/periodo-activo')
        ]);
        paralelosMatriculaCache = cp.paralelos || [];
        periodoMatriculaActivo = periodo;
    }

    let panel = document.getElementById('panelAsignacionParalelo');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'panelAsignacionParalelo';
        panel.className = 'form-row';
        panel.style.margin = '12px 0';
        const tableWrap = contenedor.querySelector('.table-wrap');
        contenedor.insertBefore(panel, tableWrap);
    }

    if (!paraleloAsignacionActual && paralelosMatriculaCache.length) {
        paraleloAsignacionActual = paralelosMatriculaCache[0].id;
    }

    panel.innerHTML = `
        <div class="form-group">
            <label>Paralelo destino</label>
            <select id="selectParaleloAsignacion">
                ${paralelosMatriculaCache.map(p => `
                    <option value="${p.id}" ${String(p.id) === String(paraleloAsignacionActual) ? 'selected' : ''}>
                        Paralelo ${p.nombre}
                    </option>
                `).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Periodo activo</label>
            <input value="${periodoMatriculaActivo?.nombre || periodoMatriculaActivo?.id || '-'}" disabled>
        </div>
    `;

    document.getElementById('selectParaleloAsignacion')?.addEventListener('change', async (event) => {
        paraleloAsignacionActual = event.target.value;
        await listarMatriculadosActuales();
    });
}

listarPreMatriculados = async function listarPreMatriculadosManual() {
    if (bsSelectorModal) bsSelectorModal.hide();
    cerrarListaActual();

    const contenedor = document.getElementById('contenedor-pre-matriculados');
    const tbody = document.getElementById('listaAlumnosFiltrados');
    const txtTitulo = document.getElementById('txtCursoLista');
    if (!contenedor || !tbody) return;

    contenedor.style.display = 'block';
    txtTitulo.textContent = `Asignar estudiantes: ${cursoActualNombre}`;
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Cargando estudiantes...</td></tr>";

    try {
        await prepararAsignacionManualParalelo();
        const periodo = periodoMatriculaActivo || await api('/api/academico/periodo-activo');
        periodoMatriculaActivo = periodo;
        const [alumnos, matriculas] = await Promise.all([
            api('/api/students'),
            api(`/api/enrollments?periodo_id=${periodo.id}`)
        ]);
        const idsMatriculados = new Set((matriculas || []).map(m => Number(m.estudiante_id)));
        alumnosCursoCache = (alumnos || []).filter(a => !idsMatriculados.has(Number(a.id)));
        renderizarTablaFiltrada(alumnosCursoCache);
        contenedor.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger">No se pudo cargar estudiantes.</td></tr>`;
    }
};

renderizarTablaFiltrada = function renderizarTablaFiltradaManual(lista) {
    const tbody = document.getElementById('listaAlumnosFiltrados');
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = "<tr><td colspan='4' class='muted' style='text-align:center;'>No hay estudiantes pendientes de asignar en este periodo.</td></tr>";
        return;
    }

    lista.forEach(est => {
        tbody.innerHTML += `
            <tr>
                <td>${est.cedula_est}</td>
                <td style="font-weight:bold;text-transform:uppercase;">
                    ${est.apellidos_est}, ${est.nombres_est}
                </td>
                <td><span class="badge warn">${est.estado || 'SIN MATRICULA'}</span></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="asignarAlumnoAParalelo('${est.id}', '${String(est.apellidos_est).replace(/'/g, "\\'")}', '${String(est.nombres_est).replace(/'/g, "\\'")}')">
                        Asignar al paralelo
                    </button>
                </td>
            </tr>
        `;
    });
};

async function asignarAlumnoAParalelo(id, apellidos, nombres) {
    const paraleloId = document.getElementById('selectParaleloAsignacion')?.value || paraleloAsignacionActual;
    if (!paraleloId) {
        alert("Seleccione un paralelo destino.");
        return;
    }

    const paraleloNombre = paralelosMatriculaCache.find(p => String(p.id) === String(paraleloId))?.nombre || "";
    if (!confirm(`Asignar a ${apellidos} ${nombres} en ${cursoActualNombre} paralelo ${paraleloNombre}?`)) return;

    try {
        const periodo = periodoMatriculaActivo || await api('/api/academico/periodo-activo');
        periodoMatriculaActivo = periodo;
        await api('/api/enrollments/asignar-manual', {
            method: 'POST',
            body: {
                estudiante_id: id,
                periodo_id: periodo.id,
                curso_id: cursoActualId,
                paralelo_id: paraleloId,
                fecha_matricula: new Date().toISOString().slice(0, 10)
            }
        });

        alert("Estudiante asignado correctamente.");
        await listarPreMatriculados();
        await listarMatriculadosActuales();
        await renderizarCursos();
        if (window.actualizarDashboard) window.actualizarDashboard();
    } catch (err) {
        alert("Error: " + (err.message || "No se pudo asignar."));
    }
}

listarMatriculadosActuales = async function listarMatriculadosActualesManual() {
    if (bsSelectorModal) bsSelectorModal.hide();
    cerrarListaPre();

    const contenedor = document.getElementById('contenedor-matriculados-actuales');
    const tbody = document.getElementById('listaMatriculadosActuales');
    const txtTitulo = document.getElementById('txtCursoMatriculados');
    if (!contenedor || !tbody) return;

    contenedor.style.display = 'block';
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Cargando...</td></tr>";

    try {
        await prepararAsignacionManualParalelo();
        const paraleloId = document.getElementById('selectParaleloAsignacion')?.value || paraleloAsignacionActual;
        const paraleloNombre = paralelosMatriculaCache.find(p => String(p.id) === String(paraleloId))?.nombre || "-";
        const periodo = periodoMatriculaActivo || await api('/api/academico/periodo-activo');
        periodoMatriculaActivo = periodo;
        txtTitulo.textContent = `Matriculados: ${cursoActualNombre} - Paralelo ${paraleloNombre}`;

        const inscritos = await api(`/api/enrollments?periodo_id=${periodo.id}&curso_id=${cursoActualId}&paralelo_id=${paraleloId}&estado=MATRICULADO`);
        tbody.innerHTML = "";

        if (!inscritos.length) {
            tbody.innerHTML = "<tr><td colspan='5' class='muted' style='text-align:center;'>Sin alumnos en este paralelo.</td></tr>";
            return;
        }

        inscritos.forEach(est => {
            tbody.innerHTML += `
                <tr>
                    <td>${est.cedula}</td>
                    <td style="font-weight:bold;text-transform:uppercase;">${est.estudiante}</td>
                    <td>${est.curso}<br><small class="muted">Paralelo ${est.paralelo}</small></td>
                    <td><span class="badge ok">${est.estado}</span></td>
                    <td>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                Opciones
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="generarCertificadoMatricula('${est.estudiante_id}', '${cursoActualNombre}')">Certificado</a></li>
                                <li><a class="dropdown-item" href="#" onclick="prepararEdicion('${est.estudiante_id}')">Editar datos</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="retirarMatricula('${est.id}', '${String(est.estudiante).replace(/'/g, "\\'")}')">Retirar de este paralelo</a></li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        });
        contenedor.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Error al cargar matriculados.</td></tr>`;
    }
};

async function retirarMatricula(id, nombreCompleto) {
    if (!confirm(`Retirar a ${nombreCompleto} de este paralelo?`)) return;
    try {
        await api(`/api/enrollments/${id}/estado`, {
            method: 'PUT',
            body: { estado: 'RETIRADO' }
        });
        alert("Estudiante retirado del paralelo.");
        await listarMatriculadosActuales();
        await listarPreMatriculados();
    } catch (err) {
        alert("Error: " + (err.message || "No se pudo retirar."));
    }
}

window.listarPreMatriculados = listarPreMatriculados;
window.listarMatriculadosActuales = listarMatriculadosActuales;
window.asignarAlumnoAParalelo = asignarAlumnoAParalelo;
window.retirarMatricula = retirarMatricula;

/* ========================================================
   CORRECCION FINAL: PREMATRICULA NO ES DISTRIBUCION
   Distribucion vive en su propio boton y trabaja con matriculas.
   ======================================================== */

listarPreMatriculados = async function listarPreMatriculadosOriginal() {
    if (bsSelectorModal) bsSelectorModal.hide();
    cerrarListaActual();
    cerrarDistribucion();

    const contenedor = document.getElementById('contenedor-pre-matriculados');
    const tbody = document.getElementById('listaAlumnosFiltrados');
    const txtTitulo = document.getElementById('txtCursoLista');
    const panel = document.getElementById('panelAsignacionParalelo');
    if (panel) panel.remove();

    if (!contenedor || !tbody) return;
    contenedor.style.display = 'block';
    txtTitulo.textContent = `Listado Oficial: ${cursoActualNombre}`;
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Sincronizando...</td></tr>";

    try {
        const alumnos = await api('/api/students');
        alumnosCursoCache = alumnos.filter(a => a.curso_id == cursoActualId && a.estado !== 'ACTIVO');
        renderizarTablaFiltrada(alumnosCursoCache);
        contenedor.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert("No se pudo cargar el listado oficial.");
    }
};

renderizarTablaFiltrada = function renderizarTablaFiltradaPrematricula(lista) {
    const tbody = document.getElementById('listaAlumnosFiltrados');
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!lista.length) {
        tbody.innerHTML = "<tr><td colspan='4' class='muted' style='text-align:center;'>No hay estudiantes pendientes.</td></tr>";
        return;
    }

    lista.forEach(est => {
        tbody.innerHTML += `
            <tr>
                <td>${est.cedula_est}</td>
                <td style="font-weight:bold;text-transform:uppercase;color:var(--green);">
                    ${est.apellidos_est}, ${est.nombres_est}
                </td>
                <td><span class="badge warn">${est.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="confirmarMatriculaPre('${est.id}', '${String(est.apellidos_est).replace(/'/g, "\\'")}', '${String(est.nombres_est).replace(/'/g, "\\'")}')">
                        Matricular
                    </button>
                </td>
            </tr>
        `;
    });
};

function cerrarDistribucion() {
    const el = document.getElementById('contenedor-distribucion');
    if (el) el.style.display = 'none';
}

async function abrirDistribucion() {
    if (bsSelectorModal) bsSelectorModal.hide();
    cerrarListaPre();
    cerrarListaActual();

    const contenedor = document.getElementById('contenedor-distribucion');
    const tbody = document.getElementById('listaDistribucionEstudiantes');
    const titulo = document.getElementById('txtCursoDistribucion');
    const select = document.getElementById('selectParaleloDistribucion');
    const checkTodos = document.getElementById('checkDistribucionTodos');
    if (!contenedor || !tbody || !select) return;

    contenedor.style.display = 'block';
    if (checkTodos) checkTodos.checked = false;
    titulo.textContent = `Distribucion: ${cursoActualNombre}`;
    tbody.innerHTML = `<tr><td colspan="5" class="muted text-center">Cargando distribucion...</td></tr>`;

    try {
        const [cp, periodo] = await Promise.all([
            api('/api/academico/cursos-paralelos'),
            api('/api/academico/periodo-activo')
        ]);
        paralelosMatriculaCache = cp.paralelos || [];
        periodoMatriculaActivo = periodo;

        select.innerHTML = paralelosMatriculaCache.map(p => `
            <option value="${p.id}">Paralelo ${p.nombre}</option>
        `).join('');

        const estudiantes = await api(`/api/enrollments?periodo_id=${periodo.id}&curso_id=${cursoActualId}`);
        renderDistribucion(estudiantes || []);
        contenedor.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger">No se pudo cargar distribucion.</td></tr>`;
    }
}

function renderDistribucion(rows) {
    const tbody = document.getElementById('listaDistribucionEstudiantes');
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="muted text-center">No hay estudiantes matriculados en este curso.</td></tr>`;
        return;
    }

    rows.forEach(row => {
        tbody.innerHTML += `
            <tr>
                <td><input type="checkbox" class="check-distribucion" value="${row.id}"></td>
                <td style="font-weight:800;text-transform:uppercase;">${row.estudiante}</td>
                <td>${row.cedula}</td>
                <td>Paralelo ${row.paralelo}</td>
                <td><span class="badge ok">${row.estado}</span></td>
            </tr>
        `;
    });
}

listarMatriculadosActuales = async function listarMatriculadosActualesPorCurso() {
    if (bsSelectorModal) bsSelectorModal.hide();
    cerrarListaPre();
    cerrarDistribucion();

    const contenedor = document.getElementById('contenedor-matriculados-actuales');
    const tbody = document.getElementById('listaMatriculadosActuales');
    const txtTitulo = document.getElementById('txtCursoMatriculados');
    if (!contenedor || !tbody) return;

    contenedor.style.display = 'block';
    txtTitulo.textContent = `Matriculados: ${cursoActualNombre}`;
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Cargando...</td></tr>";

    try {
        const periodo = periodoMatriculaActivo || await api('/api/academico/periodo-activo');
        periodoMatriculaActivo = periodo;
        const inscritos = await api(`/api/enrollments?periodo_id=${periodo.id}&curso_id=${cursoActualId}`);
        tbody.innerHTML = "";

        if (!inscritos.length) {
            tbody.innerHTML = "<tr><td colspan='5' class='muted' style='text-align:center;'>Sin alumnos matriculados en este curso.</td></tr>";
            return;
        }

        inscritos.forEach(est => {
            tbody.innerHTML += `
                <tr>
                    <td>${est.cedula}</td>
                    <td style="font-weight:bold;text-transform:uppercase;">${est.estudiante}</td>
                    <td>${est.curso}<br><small class="muted">Paralelo ${est.paralelo}</small></td>
                    <td><span class="badge ok">${est.estado}</span></td>
                    <td>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                Opciones
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="generarCertificadoMatricula('${est.estudiante_id}', '${cursoActualNombre}')">Certificado</a></li>
                                <li><a class="dropdown-item" href="#" onclick="prepararEdicion('${est.estudiante_id}')">Editar datos</a></li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        });
        contenedor.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Error al cargar matriculados.</td></tr>`;
    }
};

function toggleDistribucionTodos(input) {
    document.querySelectorAll('.check-distribucion').forEach(check => {
        check.checked = input.checked;
    });
}

async function distribuirSeleccionados() {
    const ids = Array.from(document.querySelectorAll('.check-distribucion:checked')).map(input => Number(input.value));
    const paraleloId = document.getElementById('selectParaleloDistribucion')?.value;
    if (!ids.length) {
        alert("Seleccione al menos un estudiante.");
        return;
    }
    if (!paraleloId) {
        alert("Seleccione un paralelo destino.");
        return;
    }

    const paraleloNombre = paralelosMatriculaCache.find(p => String(p.id) === String(paraleloId))?.nombre || "";
    if (!confirm(`Mover ${ids.length} estudiante(s) al paralelo ${paraleloNombre}?`)) return;

    try {
        const periodo = periodoMatriculaActivo || await api('/api/academico/periodo-activo');
        periodoMatriculaActivo = periodo;
        await api('/api/enrollments/distribuir', {
            method: 'POST',
            body: {
                matricula_ids: ids,
                curso_id: cursoActualId,
                paralelo_id: paraleloId,
                periodo_id: periodo.id
            }
        });
        alert("Distribucion actualizada.");
        await abrirDistribucion();
        await renderizarCursos();
    } catch (err) {
        alert("Error: " + (err.message || "No se pudo distribuir."));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnDistribucion')?.addEventListener('click', abrirDistribucion);
});

window.listarPreMatriculados = listarPreMatriculados;
window.listarMatriculadosActuales = listarMatriculadosActuales;
window.renderizarTablaFiltrada = renderizarTablaFiltrada;
window.abrirDistribucion = abrirDistribucion;
window.cerrarDistribucion = cerrarDistribucion;
window.toggleDistribucionTodos = toggleDistribucionTodos;
window.distribuirSeleccionados = distribuirSeleccionados;
