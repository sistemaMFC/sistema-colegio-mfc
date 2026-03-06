/* ========================================================
    LÓGICA DE VISUALIZACIÓN DE CURSOS - COLEGIO MFC
    ACTUALIZACIÓN: SELECTOR BOOTSTRAP Y LISTADO OFICIAL
   ======================================================== */

// Variables globales para el contexto de la matrícula
let cursoActualId = null;
let cursoActualNombre = "";
let bsSelectorModal = null; // Instancia del modal de Bootstrap

/**
 * Renderiza las tarjetas de los cursos con sus estadísticas
 */
async function renderizarCursos() {
    const contenedor = document.querySelector('.grid-cursos-mfc');
    if (!contenedor) return;

    try {
        const respuesta = await api('/api/admin/cursos/estadisticas');
        const cursos = Array.isArray(respuesta) ? respuesta : [];

        contenedor.innerHTML = "";

        if (cursos.length === 0) {
            contenedor.innerHTML = `<p class="muted">No hay cursos en la base de datos.</p>`;
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
    GESTIÓN DE PRE-MATRICULADOS (LISTADO OFICIAL)
   ======================================================== */

/**
 * Carga y muestra los alumnos ya registrados en el curso seleccionado
 */
async function listarPreMatriculados() {
    // Cerramos el selector de Bootstrap
    if (bsSelectorModal) bsSelectorModal.hide();

    const contenedor = document.getElementById('contenedor-pre-matriculados');
    const tbody = document.getElementById('listaAlumnosFiltrados');
    const txtTitulo = document.getElementById('txtCursoLista');

    if (!contenedor || !tbody) return;

    // Mostrar contenedor y limpiar tabla
    contenedor.style.display = 'block';
    txtTitulo.textContent = `Listado Oficial: ${cursoActualNombre}`;
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>⏳ Cargando estudiantes...</td></tr>";

    try {
        const alumnos = await api('/api/students');
        
        // Filtramos solo los alumnos que pertenecen al curso actual
        const filtrados = alumnos.filter(a => a.curso_id == cursoActualId);

        tbody.innerHTML = "";

        if (filtrados.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' class='muted' style='text-align:center;'>No hay alumnos registrados en este curso.</td></tr>";
            return;
        }

        filtrados.forEach(est => {
            tbody.innerHTML += `
                <tr>
                    <td>${est.cedula_est}</td>
                    <td style="font-weight:bold; text-transform:uppercase;">${est.apellidos_est}, ${est.nombres_est}</td>
                    <td>${cursoActualNombre}</td>
                    <td><span class="pill badge info">${est.estado}</span></td>
                </tr>
            `;
        });

        // Scroll suave hasta la tabla para mejorar la experiencia
        contenedor.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error("Error al listar:", err);
        alert("❌ No se pudo cargar la lista de alumnos.");
    }
}

function cerrarListaPre() {
    document.getElementById('contenedor-pre-matriculados').style.display = 'none';
}

/* ========================================================
    GESTIÓN DE ENVÍO DE DATOS (MATRÍCULA NUEVA)
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

        alert("✨ ¡Excelente! " + res.message);
        cerrarFormularioMatricula();
        renderizarCursos(); 
        
    } catch (err) {
        alert("❌ Error: " + (err.message || "No se pudo completar el registro"));
    }
}

/* ========================================================
    FUNCIONES DE LOS MODALES
   ======================================================== */

function abrirSelectorMatricula(id, nombre) {
    cursoActualId = id;
    cursoActualNombre = nombre;
    
    // Actualizar título en el modal de Bootstrap
    const titulo = document.getElementById('tituloCursoSeleccionado');
    if (titulo) titulo.textContent = `Curso: ${nombre}`;

    // Inicializar Modal de Bootstrap si no existe
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
    INICIALIZACIÓN DE EVENTOS
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
    renderizarCursos();

    // 1. Escuchar el envío del formulario
    document.getElementById('formNuevaMatricula')?.addEventListener('submit', procesarMatriculaNueva);

    // 2. Botón Matrícula Nueva (dentro del selector)
    document.getElementById('btnMatriculaNueva')?.addEventListener('click', abrirFormularioMatriculaNueva);

    // 3. Botón Pre-Matriculados (dentro del selector)
    document.getElementById('btnMatriculaAntigua')?.addEventListener('click', listarPreMatriculados);

    // 4. Cerrar modales MFC al hacer clic fuera (solo para el de formulario que no es de Bootstrap)
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modalFormMatricula') cerrarFormularioMatricula();
    });
});

// Exponer funciones globales para los onclick del HTML
window.renderizarCursos = renderizarCursos;
window.abrirSelectorMatricula = abrirSelectorMatricula;
window.cerrarFormularioMatricula = cerrarFormularioMatricula;
window.cerrarListaPre = cerrarListaPre;