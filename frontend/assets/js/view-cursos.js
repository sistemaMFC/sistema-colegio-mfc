/* ========================================================
    LÓGICA DE VISUALIZACIÓN DE CURSOS - COLEGIO MFC
    ACTUALIZACIÓN: INTEGRACIÓN CON FORMULARIO DE MATRÍCULA
   ======================================================== */

// Variables globales para el contexto de la matrícula
let cursoActualId = null;
let cursoActualNombre = "";

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
            // Cada tarjeta ahora llama a abrirSelectorMatricula
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
    FUNCIONES DE LOS MODALES (SELECTOR Y FORMULARIO)
   ======================================================== */

// 1. Abre el selector de "Nuevo" o "Antiguo"
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

// 2. Abre el Gran Formulario de Matrícula Nueva
function abrirFormularioMatriculaNueva() {
    cerrarSelector(); // Cerramos el selector pequeño primero
    
    // Actualizamos el título del curso en el formulario grande
    const txtCurso = document.getElementById('txtCursoSeleccionado');
    if (txtCurso) txtCurso.textContent = `Curso: ${cursoActualNombre}`;
    
    // Mostramos el formulario de dos columnas
    const modalForm = document.getElementById('modalFormMatricula');
    if (modalForm) modalForm.style.display = 'grid';
}

function cerrarFormularioMatricula() {
    const modalForm = document.getElementById('modalFormMatricula');
    if (modalForm) {
        modalForm.style.display = 'none';
        document.getElementById('formNuevaMatricula')?.reset(); // Limpiamos campos al cerrar
    }
}

/* ========================================================
    EVENTOS DE BOTONES Y CLICK EXTERNO
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // Configurar botón "Matrícula Nueva" para que abra el formulario real
    document.getElementById('btnMatriculaNueva')?.addEventListener('click', () => {
        abrirFormularioMatriculaNueva();
    });

    // Opción 2: Pre-matriculado (Pendiente de lógica de búsqueda)
    document.getElementById('btnMatriculaAntigua')?.addEventListener('click', () => {
        cerrarSelector();
        alert("🔍 Buscador de Pre-Matriculados en desarrollo...");
    });

    // Cerrar cualquier modal si se hace clic fuera del contenido
    window.addEventListener('click', (e) => {
        const modalSel = document.getElementById('modalSelectorMatricula');
        const modalForm = document.getElementById('modalFormMatricula');
        
        if (e.target === modalSel) cerrarSelector();
        if (e.target === modalForm) cerrarFormularioMatricula();
    });
});

// Exportar funciones para que sean accesibles desde el HTML
window.renderizarCursos = renderizarCursos;
window.cerrarSelector = cerrarSelector;
window.cerrarFormularioMatricula = cerrarFormularioMatricula;