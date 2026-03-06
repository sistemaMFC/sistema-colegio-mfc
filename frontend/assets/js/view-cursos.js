/* ========================================================
    LÓGICA DE VISUALIZACIÓN DE CURSOS - COLEGIO MFC
    ACTUALIZACIÓN FINAL: MATRÍCULA NUEVA, PRE Y ACTUALES
   ======================================================== */

// Variables globales para el contexto de la matrícula
let cursoActualId = null;
let cursoActualNombre = "";
let bsSelectorModal = null; // Instancia del modal de Bootstrap
let alumnosCursoCache = [];  // Cache para búsqueda rápida

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
                    <div class="curso-numero-wrapper">
                        ${c.total_matriculados || 0}
                    </div>
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
    
    // Cerramos la otra lista por si acaso
    cerrarListaActual();

    const contenedor = document.getElementById('contenedor-pre-matriculados');
    const tbody = document.getElementById('listaAlumnosFiltrados');
    const txtTitulo = document.getElementById('txtCursoLista');

    if (!contenedor || !tbody) return;

    contenedor.style.display = 'block';
    txtTitulo.textContent = `Listado Oficial: ${cursoActualNombre}`;
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>⏳ Cargando base de datos...</td></tr>";

    try {
        const alumnos = await api('/api/students');
        
        // FILTRADO: Solo alumnos del curso seleccionado que NO estén activos
        alumnosCursoCache = alumnos.filter(a => a.curso_id == cursoActualId && a.estado !== 'ACTIVO');

        renderizarTablaFiltrada(alumnosCursoCache);
        contenedor.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error("Error al listar:", err);
        alert("❌ Error al cargar listado de pre-matriculados.");
    }
}

/**
 * Renderiza las filas de la tabla de PRE-MATRICULADOS
 */
function renderizarTablaFiltrada(lista) {
    const tbody = document.getElementById('listaAlumnosFiltrados');
    tbody.innerHTML = "";

    if (lista.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='muted' style='text-align:center;'>No hay estudiantes pendientes.</td></tr>";
        return;
    }

    lista.forEach(est => {
        // Formato: APELLIDO, NOMBRE
        tbody.innerHTML += `
            <tr>
                <td>${est.cedula_est}</td>
                <td style="font-weight:bold; text-transform:uppercase; color: var(--verde-primario);">
                    ${est.apellidos_est}, ${est.nombres_est}
                </td>
                <td><span class="pill badge info">${est.estado}</span></td>
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
 * LOGICA DE CONFIRMACIÓN PARA PRE-MATRICULADOS
 */
async function confirmarMatriculaPre(id, apellidos, nombres) {
    if (confirm(`¿Desea legalizar la matrícula de ${apellidos}, ${nombres} en ${cursoActualNombre}?`)) {
        try {
            await api(`/api/students/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ estado: 'ACTIVO' })
            });
            alert("✨ Estudiante matriculado correctamente.");
            listarPreMatriculados(); // Refrescar lista
            renderizarCursos();     // Actualizar tarjetas
        } catch (err) {
            alert("❌ Error: " + err.message);
        }
    }
}

/* ========================================================
    3. VER MATRICULADOS ACTUALES (BOTÓN AMARILLO)
   ======================================================== */

async function listarMatriculadosActuales() {
    if (bsSelectorModal) bsSelectorModal.hide();
    
    // Cerramos la otra lista por si acaso
    cerrarListaPre();

    const contenedor = document.getElementById('contenedor-matriculados-actuales');
    const tbody = document.getElementById('listaMatriculadosActuales');
    const txtTitulo = document.getElementById('txtCursoMatriculados');

    if (!contenedor || !tbody) return;

    contenedor.style.display = 'block';
    txtTitulo.textContent = `Matriculados: ${cursoActualNombre}`;
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>⏳ Cargando matriculados...</td></tr>";

    try {
        const alumnos = await api('/api/students');
        
        // FILTRADO: Solo alumnos del curso seleccionado que YA estén activos
        const inscritos = alumnos.filter(a => a.curso_id == cursoActualId && a.estado === 'ACTIVO');

        tbody.innerHTML = "";

        if (inscritos.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' class='muted' style='text-align:center;'>No hay alumnos matriculados aún en este curso.</td></tr>";
            return;
        }

        inscritos.forEach(est => {
            tbody.innerHTML += `
                <tr>
                    <td>${est.cedula_est}</td>
                    <td style="font-weight:bold; text-transform:uppercase;">
                        ${est.apellidos_est}, ${est.nombres_est}
                    </td>
                    <td>${est.nombre_rep || 'S/I'}</td>
                    <td><span class="badge bg-success">MATRICULADO</span></td>
                </tr>
            `;
        });

        contenedor.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        alert("❌ Error al cargar matriculados.");
    }
}

/**
 * Función para el buscador en tiempo real (Afecta a la lista de PRE)
 */
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
    document.getElementById('contenedor-pre-matriculados').style.display = 'none';
}

function cerrarListaActual() {
    document.getElementById('contenedor-matriculados-actuales').style.display = 'none';
}

/* ========================================================
    4. GESTIÓN DE ENVÍO (MATRÍCULA NUEVA)
   ======================================================== */

async function procesarMatriculaNueva(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
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
        const res = await api('/api/students', {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        alert("✨ " + res.message);
        cerrarFormularioMatricula();
        renderizarCursos(); 
        
    } catch (err) {
        alert("❌ Error en el Servidor: " + (err.message || "Verifique los datos."));
    }
}

/* ========================================================
    5. FUNCIONES DE MODALES
   ======================================================== */

function abrirSelectorMatricula(id, nombre) {
    cursoActualId = id;
    cursoActualNombre = nombre;
    
    const titulo = document.getElementById('tituloCursoSeleccionado');
    if (titulo) titulo.textContent = `Curso: ${nombre}`;

    if (!bsSelectorModal) {
        const modalEl = document.getElementById('modalSelectorBootstrap');
        bsSelectorModal = new bootstrap.Modal(modalEl);
    }
    
    bsSelectorModal.show();
}

function abrirFormularioMatriculaNueva() {
    if (bsSelectorModal) bsSelectorModal.hide();
    const txtCurso = document.getElementById('txtCursoSeleccionado');
    if (txtCurso) txtCurso.textContent = `Curso: ${cursoActualNombre}`;
    
    const modalForm = document.getElementById('modalFormMatricula');
    if (modalForm) modalForm.style.display = 'grid';
}

function cerrarFormularioMatricula() {
    const modalForm = document.getElementById('modalFormMatricula');
    if (modalForm) {
        modalForm.style.display = 'none';
        document.getElementById('formNuevaMatricula')?.reset();
    }
}

/* ========================================================
    6. INICIALIZACIÓN DE EVENTOS
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
    renderizarCursos();

    // Buscador
    document.getElementById('inputBuscarEstudiante')?.addEventListener('input', filtrarEstudiantesPre);

    // Envío de formulario
    document.getElementById('formNuevaMatricula')?.addEventListener('submit', procesarMatriculaNueva);

    // Botones del Modal Selector
    document.getElementById('btnMatriculaNueva')?.addEventListener('click', abrirFormularioMatriculaNueva);
    document.getElementById('btnMatriculaAntigua')?.addEventListener('click', listarPreMatriculados);
    document.getElementById('btnVerMatriculados')?.addEventListener('click', listarMatriculadosActuales);

    // Cerrar clic fuera
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modalFormMatricula') cerrarFormularioMatricula();
    });
});

// Exponer funciones globales
window.renderizarCursos = renderizarCursos;
window.abrirSelectorMatricula = abrirSelectorMatricula;
window.cerrarFormularioMatricula = cerrarFormularioMatricula;
window.cerrarListaPre = cerrarListaPre;
window.cerrarListaActual = cerrarListaActual;