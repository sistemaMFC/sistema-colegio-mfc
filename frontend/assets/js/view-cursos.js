/* ========================================================
   LÓGICA DE RENDERIZADO DE CURSOS - MÓDULO MATRÍCULAS
   ======================================================== */

async function renderizarCursos() {
    // Usamos el selector exacto de tu HTML
    const contenedor = document.querySelector('#view-matriculas .grid-cursos-mfc');
    
    if(!contenedor) {
        console.warn("No se encontró el contenedor .grid-cursos-mfc en la vista de matrículas");
        return;
    }

    try {
        // Llamada a la API
        const respuesta = await api('/api/cursos/estadisticas'); 
        
        // --- VALIDACIÓN ANTI-ERROR (IMPORTANTE) ---
        // Si 'respuesta' no es una lista, la convertimos en una lista vacía para que forEach no falle
        const cursos = Array.isArray(respuesta) ? respuesta : [];
        
        contenedor.innerHTML = "";

        if (cursos.length === 0) {
            contenedor.innerHTML = `<p class="muted">No hay cursos configurados en la base de datos o la respuesta es inválida.</p>`;
            return;
        }

        cursos.forEach((c) => {
            // Nota: He usado c.nombre porque en tu SQL usamos 'nombre' para el curso
            contenedor.innerHTML += `
                <div class="curso-card-mfc" onclick="abrirFormularioMatricula('${c.nombre || c.curso}')">
                    <div class="curso-numero-wrapper">
                        ${c.total_matriculados || 0}
                    </div>
                    <div class="curso-info-mfc">
                        <h3 class="curso-nombre-mfc">${c.nombre || c.curso}</h3>
                        <span class="curso-detalle-mfc">Haga clic para matricular</span>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error("Error al cargar cursos:", err);
        contenedor.innerHTML = `
            <div style="padding: 20px; color: #ff6b6b; border: 1px solid #ff6b6b; border-radius: 10px;">
                <strong>Error al conectar con el servidor:</strong><br>
                ${err.message}
            </div>
        `;
    }
}

/**
 * Función que se dispara al hacer clic en un curso
 */
function abrirFormularioMatricula(nombreCurso) {
    console.log("Abriendo matrícula para:", nombreCurso);
    alert(`Preparando inscripción para: ${nombreCurso}`);
}

// Hacemos que la función esté disponible globalmente
window.renderizarCursos = renderizarCursos;