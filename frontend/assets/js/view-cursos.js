/* ========================================================
    LÓGICA DE VISUALIZACIÓN DE CURSOS - COLEGIO MFC
    ACTUALIZACIÓN: SELECTOR DUAL DE MATRÍCULA
   ======================================================== */

// Variable para guardar el ID del curso donde se hizo clic
let cursoActualId = null;

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
    FUNCIONES DEL SELECTOR (GLORIA)
   ======================================================== */

function abrirSelectorMatricula(id, nombre) {
    cursoActualId = id; // Guardamos el ID para usarlo después
    
    // 1. Cambiamos el título del modal con el nombre del curso
    const titulo = document.getElementById('tituloCursoSeleccionado');
    if (titulo) titulo.textContent = `Curso: ${nombre}`;

    // 2. Mostramos el modal de cristal
    const modal = document.getElementById('modalSelectorMatricula');
    if (modal) {
        modal.style.display = 'grid'; // Usamos grid para centrarlo
    }
}

function cerrarSelector() {
    const modal = document.getElementById('modalSelectorMatricula');
    if (modal) modal.style.display = 'none';
}

/* ========================================================
    EVENTOS DE LAS OPCIONES DEL SELECTOR
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // Opción 1: Matrícula Nueva
    document.getElementById('btnMatriculaNueva')?.addEventListener('click', () => {
        cerrarSelector();
        console.log("Iniciando registro de nuevo alumno para curso:", cursoActualId);
        alert("✨ Abriendo formulario de Matrícula Nueva para " + document.getElementById('tituloCursoSeleccionado').textContent);
        // Aquí llamaremos a la función del formulario de registro
    });

    // Opción 2: Pre-matriculado
    document.getElementById('btnMatriculaAntigua')?.addEventListener('click', () => {
        cerrarSelector();
        console.log("Iniciando búsqueda de pre-matriculado para curso:", cursoActualId);
        alert("🔍 Abriendo buscador de Pre-Matriculados para " + document.getElementById('tituloCursoSeleccionado').textContent);
        // Aquí llamaremos a la lógica de búsqueda de alumnos
    });

    // Cerrar si hace clic fuera del cristal
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modalSelectorMatricula');
        if (e.target === modal) cerrarSelector();
    });
});

// Exportar función al objeto global
window.renderizarCursos = renderizarCursos;
window.cerrarSelector = cerrarSelector;