/* ========================================================
    LÓGICA DE VISUALIZACIÓN DE CURSOS - COLEGIO MFC
    ACTUALIZACIÓN: EDICIÓN, ELIMINACIÓN SEGURA Y OPCIONES
   ======================================================== */

// Variables globales para el contexto de la matrícula
let cursoActualId = null;
let cursoActualNombre = "";
let bsSelectorModal = null; // Instancia del modal de Bootstrap
let alumnosCursoCache = [];  // Caché para búsqueda rápida y filtrado local

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
                <div class="curso-card-mfc" onclick="abrirSelectorMatricula('${c.id}', '${c.nombre}')">
                    <div class="curso-numero-wrapper">
                        ${c.total_matriculados || 0}
                    </div>
                    <div class="curso-info-mfc">
                        <h3 class="curso-nombre-mfc">${c.nombre}</h3>
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

async function confirmarMatriculaPre(id, apellidos, nombres) {
    if (confirm(`¿Desea formalizar la matrícula de ${apellidos}, ${nombres}?`)) {
        try {
            await api(`/api/students/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ estado: 'ACTIVO' })
            });
            alert("✨ Estudiante matriculado.");
            listarPreMatriculados(); 
            renderizarCursos();     
            if(window.actualizarDashboard) window.actualizarDashboard();
        } catch (err) {
            alert("❌ Error: " + err.message);
        }
    }
}

/* ========================================================
    3. VER MATRICULADOS ACTUALES (ANULACIÓN POR ELIMINACIÓN)
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
 * Pide la clave 'SistemaMFC' y borra al estudiante de la base de datos.
 */
async function anularMatricula(id, nombreCompleto) {
    if (!id) return;

    // 1. Advertencia inicial
    if (!confirm(`⚠️ ¡ATENCIÓN! ¿Está seguro de ANULAR a ${nombreCompleto}?\nEsta acción lo ELIMINARÁ definitivamente de la base de datos.`)) return;

    // 2. Pedir contraseña de seguridad
    const password = prompt("🔐 Ingrese la CLAVE DE SEGURIDAD para confirmar la eliminación:");
    
    if (password !== "SistemaMFC") {
        alert("❌ Clave incorrecta. Acción cancelada.");
        return;
    }

    try {
        // Llamada al método DELETE que configuramos en students.routes.js
        await api(`/api/students/${id}`, {
            method: 'DELETE'
        });

        alert("🗑️ Estudiante eliminado correctamente del sistema.");

        // Refresco total
        await renderizarCursos();
        if(window.actualizarDashboard) window.actualizarDashboard();
        
        cerrarListaActual();

    } catch (err) {
        console.error("Error al eliminar:", err);
        alert("❌ Error: No se pudo eliminar el registro. Puede que tenga deudas o historial asociado.");
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
        document.getElementById('btnSubmitMatricula').textContent = "Guardar Cambios 💾";
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
    document.getElementById('btnSubmitMatricula').textContent = "Confirmar Matrícula ✨";

    const txtCurso = document.getElementById('txtCursoSeleccionado');
    if (txtCurso) txtCurso.textContent = `Curso: ${cursoActualNombre}`;
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