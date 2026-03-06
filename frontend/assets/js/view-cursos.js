/* ========================================================
    LÓGICA DE VISUALIZACIÓN DE CURSOS - COLEGIO MFC
    ACTUALIZACIÓN FINAL: SINCRONIZACIÓN SQL Y BUSCADOR
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

    const contenedor = document.getElementById('contenedor-pre-matriculados');
    const tbody = document.getElementById('listaAlumnosFiltrados');
    const txtTitulo = document.getElementById('txtCursoLista');

    if (!contenedor || !tbody) return;

    contenedor.style.display = 'block';
    txtTitulo.textContent = `Listado Oficial: ${cursoActualNombre}`;
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>⏳ Cargando base de datos...</td></tr>";

    try {
        const alumnos = await api('/api/students');
        
        // FILTRADO: Solo alumnos del curso seleccionado
        alumnosCursoCache = alumnos.filter(a => a.curso_id == cursoActualId);

        renderizarTablaFiltrada(alumnosCursoCache);
        contenedor.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error("Error al listar:", err);
        alert("❌ Error 500: Verifique la conexión o estructura de la tabla.");
    }
}

/**
 * Renderiza las filas de la tabla basadas en una lista
 */
function renderizarTablaFiltrada(lista) {
    const tbody = document.getElementById('listaAlumnosFiltrados');
    tbody.innerHTML = "";

    if (lista.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4' class='muted' style='text-align:center;'>No se encontraron estudiantes.</td></tr>";
        return;
    }

    lista.forEach(est => {
        // IMPORTANTE: Los nombres coinciden con tu DESCRIBE de MySQL
        tbody.innerHTML += `
            <tr>
                <td>${est.cedula_est}</td>
                <td style="font-weight:bold; text-transform:uppercase; color: var(--verde-primario);">
                    ${est.apellidos_est}, ${est.nombres_est}
                </td>
                <td>${est.nombre_rep || 'S/I'}</td>
                <td><span class="pill badge info">${est.estado}</span></td>
            </tr>
        `;
    });
}

/**
 * Función para el buscador en tiempo real
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

/* ========================================================
    3. GESTIÓN DE ENVÍO (MATRÍCULA NUEVA)
   ======================================================== */

async function procesarMatriculaNueva(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    // MAPEADO DE DATOS: Aseguramos que los nombres coincidan con la DB
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
        // Aquí capturamos el Error 500 y lo mostramos como alerta
        alert("❌ Error en el Servidor: " + (err.message || "Verifique los datos o si la cédula ya existe."));
    }
}

/* ========================================================
    4. FUNCIONES DE MODALES
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
    5. INICIALIZACIÓN
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
    renderizarCursos();

    // Evento para el buscador
    document.getElementById('inputBuscarEstudiante')?.addEventListener('input', filtrarEstudiantesPre);

    document.getElementById('formNuevaMatricula')?.addEventListener('submit', procesarMatriculaNueva);
    document.getElementById('btnMatriculaNueva')?.addEventListener('click', abrirFormularioMatriculaNueva);
    document.getElementById('btnMatriculaAntigua')?.addEventListener('click', listarPreMatriculados);

    window.addEventListener('click', (e) => {
        if (e.target.id === 'modalFormMatricula') cerrarFormularioMatricula();
    });
});

// Exponer funciones globales
window.renderizarCursos = renderizarCursos;
window.abrirSelectorMatricula = abrirSelectorMatricula;
window.cerrarFormularioMatricula = cerrarFormularioMatricula;
window.cerrarListaPre = cerrarListaPre;