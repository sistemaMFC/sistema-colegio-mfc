async function renderizarCursos() {
    const contenedor = document.querySelector('.grid-cursos-mfc');
    if(!contenedor) return;

    try {
        // Llamamos a la API (Note que usamos la ruta exacta)
        const respuesta = await api('/api/cursos/estadisticas'); 
        
        // Validamos que sea un array
        const cursos = Array.isArray(respuesta) ? respuesta : [];
        
        contenedor.innerHTML = "";

        if (cursos.length === 0) {
            contenedor.innerHTML = `<p class="muted">No hay cursos registrados en la base de datos.</p>`;
            return;
        }

        cursos.forEach((c) => {
            contenedor.innerHTML += `
                <div class="curso-card-mfc" onclick="abrirFormularioMatricula('${c.id}', '${c.nombre}')">
                    <div class="curso-numero-wrapper">
                        ${c.total_matriculados || 0}
                    </div>
                    <div class="curso-info-mfc">
                        <h3 class="curso-nombre-mfc">${c.nombre}</h3>
                        <span class="curso-detalle-mfc">Haga clic para matricular</span>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error("Error al cargar cursos:", err);
        contenedor.innerHTML = `<p class="danger">Error: No se pudo conectar con el servidor.</p>`;
    }
}

function abrirFormularioMatricula(id, nombre) {
    console.log(`Iniciando matrícula para ID: ${id} - ${nombre}`);
    alert(`Preparando inscripción para: ${nombre}`);
}

window.renderizarCursos = renderizarCursos;