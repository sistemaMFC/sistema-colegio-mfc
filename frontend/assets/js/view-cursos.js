/* ========================================================
   LÓGICA DE RENDERIZADO DE CURSOS - MÓDULO MATRÍCULAS
   ======================================================== */

async function renderizarCursos() {
    // Usamos el nuevo contenedor con la clase de tu diseño modular
    const contenedor = document.querySelector('#view-matriculas .grid-cursos-mfc');
    
    if(!contenedor) {
        console.warn("No se encontró el contenedor .grid-cursos-mfc en la vista de matrículas");
        return;
    }

    try {
        // Llamada a la API para traer los cursos y cuántos alumnos hay en cada uno
        const cursos = await api('/api/cursos/estadisticas'); 
        
        contenedor.innerHTML = "";

        if (cursos.length === 0) {
            contenedor.innerHTML = `<p class="muted">No hay cursos configurados en la base de datos.</p>`;
            return;
        }

        cursos.forEach((c) => {
            // Aplicamos la estructura de "Verde Difuminado" que creamos en matricula-estilo.css
            contenedor.innerHTML += `
                <div class="curso-card-mfc" onclick="abrirFormularioMatricula('${c.curso}')">
                    <div class="curso-numero-wrapper">
                        ${c.total_matriculados}
                    </div>
                    <div class="curso-info-mfc">
                        <h3 class="curso-nombre-mfc">${c.curso}</h3>
                        <span class="curso-detalle-mfc">Haga clic para matricular</span>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error("Error al cargar cursos:", err);
        contenedor.innerHTML = `<p class="danger">Error al conectar con el servidor.</p>`;
    }
}

/**
 * Función que se dispara al hacer clic en un curso
 * @param {string} nombreCurso 
 */
function abrirFormularioMatricula(nombreCurso) {
    console.log("Abriendo matrícula para:", nombreCurso);
    
    // Aquí es donde luego llamaremos al modal o formulario modular
    // Por ahora, lanzamos un aviso para confirmar que funciona el clic
    alert(`Preparando inscripción para: ${nombreCurso}`);
    
    // El siguiente paso será: setActiveView('formulario-inscripcion');
}

// Hacemos que la función esté disponible globalmente
window.renderizarCursos = renderizarCursos;