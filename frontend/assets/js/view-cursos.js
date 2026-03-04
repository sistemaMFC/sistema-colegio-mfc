/* ========================================================
    LÓGICA DE VISUALIZACIÓN DE CURSOS - COLEGIO MFC
    ACTUALIZACIÓN: INTEGRACIÓN TOTAL CON BASE DE DATOS
   ======================================================== */

// Variables globales para el contexto de la matrícula
let cursoActualId = null;
let cursoActualNombre = "";

/**
 * Renderiza las tarjetas de los cursos con sus estadísticas
 */
async function renderizarCursos() {
    const contenedor = document.querySelector('.grid-cursos-mfc');
    if(!contenedor) return;

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
                        <span class="curso-detalle-mfc">Click para matricular</span>
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
    GESTIÓN DE ENVÍO DE DATOS (EL JUEGO)
   ======================================================== */

/**
 * Captura los datos del formulario y los envía al Backend
 */
async function procesarMatriculaNueva(e) {
    e.preventDefault(); // Evitamos que la página se recargue

    const form = e.target;
    const formData = new FormData(form);
    
    // Construimos el objeto con los nombres exactos que espera el Backend
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
        curso_id: cursoActualId // El ID del curso seleccionado
    };

    try {
        // Mostramos un mensaje de carga básico en consola
        console.log("Intentando matricular en curso ID:", cursoActualId);

        // Llamada a la API (tu función api() ya pone el Token)
        const res = await api('/api/students', {
            method: 'POST',
            body: JSON.stringify(datos)
        });

        // SI HAY ÉXITO
        alert("✨ ¡Excelente! " + res.message);
        
        cerrarFormularioMatricula(); // Cerramos el modal
        renderizarCursos();          // Actualizamos los números de las tarjetas
        
    } catch (err) {
        // SI HAY ERROR (Cédula duplicada, campos vacíos, etc)
        console.error("Error en la matrícula:", err);
        alert("❌ Error: " + (err.message || "No se pudo completar el registro"));
    }
}

/* ========================================================
    FUNCIONES DE LOS MODALES
   ======================================================== */

function abrirSelectorMatricula(id, nombre) {
    cursoActualId = id;
    cursoActualNombre = nombre;
    
    const titulo = document.getElementById('tituloCursoSeleccionado');
    if (titulo) titulo.textContent = `Curso: ${nombre}`;

    const modal = document.getElementById('modalSelectorMatricula');
    if (modal) modal.style.display = 'grid';
}

function cerrarSelector() {
    const modal = document.getElementById('modalSelectorMatricula');
    if (modal) modal.style.display = 'none';
}

function abrirFormularioMatriculaNueva() {
    cerrarSelector();
    
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
    
    // 1. Escuchar el envío del formulario
    const formMatricula = document.getElementById('formNuevaMatricula');
    if (formMatricula) {
        formMatricula.addEventListener('submit', procesarMatriculaNueva);
    }

    // 2. Botón para abrir el formulario desde el selector
    document.getElementById('btnMatriculaNueva')?.addEventListener('click', abrirFormularioMatriculaNueva);

    // 3. Botón para pre-matriculados (pendiente)
    document.getElementById('btnMatriculaAntigua')?.addEventListener('click', () => {
        cerrarSelector();
        alert("🔍 Buscador de Pre-Matriculados en desarrollo...");
    });

    // 4. Cerrar al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modalSelectorMatricula') cerrarSelector();
        if (e.target.id === 'modalFormMatricula') cerrarFormularioMatricula();
    });
});

// Exponer funciones globales
window.renderizarCursos = renderizarCursos;
window.cerrarSelector = cerrarSelector;
window.cerrarFormularioMatricula = cerrarFormularioMatricula;