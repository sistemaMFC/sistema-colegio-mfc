/* ========================================================
    LÓGICA DE VISUALIZACIÓN DE CURSOS - COLEGIO MFC
    ACTUALIZACIÓN: PROMOCIÓN LÓGICA CON CLAVE DE SEGURIDAD
   ======================================================== */

// Variables globales para el contexto
let cursoActualId = null;
let cursoActualNombre = "";
let bsSelectorModal = null; 
let alumnosCursoCache = [];  

// Orden lógico de los cursos para validar promociones
const ORDEN_CURSOS = [
    "Inicial II", "Primero EGB", "Segundo EGB", "Tercero EGB", 
    "Cuarto EGB", "Quinto EGB", "Sexto EGB", "Séptimo EGB",
    "Octavo EGB", "Noveno EGB", "Décimo EGB"
];

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
            contenedor.innerHTML = `<p class="muted">No hay cursos registrados.</p>`;
            return;
        }

        cursos.forEach((c) => {
            contenedor.innerHTML += `
                <div class="curso-card-mfc" onclick="abrirSelectorMatricula('${c.id}', '${c.nombre}')">
                    <div class="curso-numero-wrapper">${c.total_matriculados || 0}</div>
                    <div class="curso-info-mfc">
                        <h3 class="curso-nombre-mfc">${c.nombre}</h3>
                        <span class="curso-detalle-mfc">Click para gestionar</span>
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
        // Filtramos por el curso seleccionado y que NO estén activos
        alumnosCursoCache = alumnos.filter(a => a.curso_id == cursoActualId && a.estado !== 'ACTIVO');
        renderizarTablaFiltrada(alumnosCursoCache);
        contenedor.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        alert("❌ Error al cargar listado oficial.");
    }
}

function renderizarTablaFiltrada(lista) {
    const tbody = document.getElementById('listaAlumnosFiltrados');
    tbody.innerHTML = "";

    if (lista.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='muted' style='text-align:center;'>No hay estudiantes pendientes en este curso.</td></tr>";
        return;
    }

    lista.forEach(est => {
        tbody.innerHTML += `
            <tr>
                <td>${est.cedula_est}</td>
                <td style="font-weight:bold; text-transform:uppercase; color: var(--green);">${est.apellidos_est}, ${est.nombres_est}</td>
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
 * FORMALIZAR MATRÍCULA CON VALIDACIÓN DE CURSO
 */
async function confirmarMatriculaPre(id, apellidos, nombres) {
    try {
        // 1. Obtener cursos para que el usuario elija
        const cursosBase = await api('/api/admin/cursos/estadisticas');
        let listaNombres = cursosBase.map(c => c.nombre).join("\n- ");
        
        const cursoDestinoNombre = prompt(
            `Matriculando a: ${apellidos} ${nombres}\n\nEscriba el NOMBRE EXACTO del curso destino:\n- ${listaNombres}`, 
            cursoActualNombre
        );

        if (!cursoDestinoNombre) return;

        const cursoDestino = cursosBase.find(c => c.nombre.trim() === cursoDestinoNombre.trim());
        if (!cursoDestino) return alert("❌ El curso escrito no es válido.");

        // 2. Validar lógica de promoción
        const idxActual = ORDEN_CURSOS.indexOf(cursoActualNombre);
        const idxDestino = ORDEN_CURSOS.indexOf(cursoDestinoNombre);

        // Si intenta saltarse más de 1 curso hacia adelante
        if (idxDestino > idxActual + 1) {
            const pass = prompt("⚠️ PROMOCIÓN EXCEPCIONAL: Ingrese la CLAVE DE SEGURIDAD para matricular en un curso superior:");
            if (pass !== "SistemaMFC") return alert("❌ Clave incorrecta. Acción cancelada.");
        }

        // 3. Ejecutar actualización
        await api(`/api/students/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ 
                estado: 'ACTIVO',
                curso_id: cursoDestino.id 
            })
        });

        alert("✨ Estudiante matriculado con éxito.");
        listarPreMatriculados(); 
        renderizarCursos();     
        if(window.actualizarDashboard) window.actualizarDashboard();

    } catch (err) {
        alert("❌ Error: " + err.message);
    }
}

/* ========================================================
    3. VER MATRICULADOS ACTUALES (ANULACIÓN)
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
                    <td style="font-weight:bold; text-transform:uppercase;">${est.apellidos_est}, ${est.nombres_est}</td>
                    <td>${est.nombre_rep || 'S/I'}<br><small class="muted">CI: ${est.cedula_rep || 'S/I'}</small></td>
                    <td><span class="badge ok">MATRICULADO</span></td>
                    <td>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">⚙️</button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="prepararEdicion('${est.id}')">✏️ Editar</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="anularMatricula('${est.id}', '${est.apellidos_est}, ${est.nombres_est}')">🚫 Anular</a></li>
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

async function anularMatricula(id, nombreCompleto) {
    if (!id) return;
    if (confirm(`⚠️ ¿Desea ANULAR la matrícula de ${nombreCompleto}?\nVolverá al Listado Oficial.`)) {
        try {
            await api(`/api/students/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ estado: 'PENDIENTE' }) 
            });
            alert("✅ Matrícula revertida.");
            renderizarCursos();
            if(window.actualizarDashboard) window.actualizarDashboard();
            cerrarListaActual();
            listarPreMatriculados(); 
        } catch (err) {
            alert("❌ Error al anular.");
        }
    }
}

/**
 * EDICIÓN DE DATOS
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
        alert("❌ Error al obtener datos.");
    }
}

/* ========================================================
    4. UTILIDADES Y EVENTOS
   ======================================================== */

function cerrarListaPre() { document.getElementById('contenedor-pre-matriculados').style.display = 'none'; }
function cerrarListaActual() { document.getElementById('contenedor-matriculados-actuales').style.display = 'none'; }

async function procesarMatricula(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const id = f.get('id_estudiante');
    const datos = {
        cedula_est: f.get('cedula_est'), nombres_est: f.get('nombres_est'), apellidos_est: f.get('apellidos_est'),
        fecha_nac: f.get('fecha_nac'), genero: f.get('genero'), nombre_rep: f.get('nombre_rep'),
        cedula_rep: f.get('cedula_rep'), parentesco_rep: f.get('parentesco_rep'), celular_rep: f.get('celular_rep'),
        sector: f.get('sector'), direccion: f.get('direccion'), curso_id: cursoActualId 
    };

    try {
        if (id) {
            await api(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
            alert("✅ Actualizado.");
        } else {
            await api('/api/students', { method: 'POST', body: JSON.stringify(datos) });
            alert("✨ Registrado.");
        }
        document.getElementById('modalFormMatricula').style.display = 'none';
        renderizarCursos(); 
        if(id) listarMatriculadosActuales();
        if(window.actualizarDashboard) window.actualizarDashboard();
    } catch (err) {
        alert("❌ Error en el proceso.");
    }
}

function abrirSelectorMatricula(id, nombre) {
    cursoActualId = id;
    cursoActualNombre = nombre;
    document.getElementById('tituloCursoSeleccionado').textContent = `Curso: ${nombre}`;
    if (!bsSelectorModal) bsSelectorModal = new bootstrap.Modal(document.getElementById('modalSelectorBootstrap'));
    bsSelectorModal.show();
}

function abrirFormularioMatriculaNueva() {
    if (bsSelectorModal) bsSelectorModal.hide();
    document.getElementById('formNuevaMatricula').reset();
    document.getElementById('edit_id_estudiante').value = "";
    document.getElementById('modalMatriculaTitulo').textContent = "Registro de Matrícula Nueva";
    document.getElementById('modalFormMatricula').style.display = 'grid';
}

document.addEventListener('DOMContentLoaded', () => {
    renderizarCursos();
    document.getElementById('formNuevaMatricula')?.addEventListener('submit', procesarMatricula);
    document.getElementById('btnMatriculaNueva')?.addEventListener('click', abrirFormularioMatriculaNueva);
    document.getElementById('btnMatriculaAntigua')?.addEventListener('click', listarPreMatriculados);
    document.getElementById('btnVerMatriculados')?.addEventListener('click', listarMatriculadosActuales);
});

window.renderizarCursos = renderizarCursos;
window.abrirSelectorMatricula = abrirSelectorMatricula;
window.anularMatricula = anularMatricula;