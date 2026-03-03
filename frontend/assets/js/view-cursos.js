async function renderizarCursos() {
    const contenedor = document.querySelector('.grid-cursos-mfc');
    if(!contenedor) return;

    try {
        // Llamamos a la nueva ruta en /admin/
        const respuesta = await api('/api/admin/cursos/estadisticas'); 
        
        const cursos = Array.isArray(respuesta) ? respuesta : [];
        
        contenedor.innerHTML = "";

        if (cursos.length === 0) {
            contenedor.innerHTML = `<p class="muted">No hay cursos en la base de datos.</p>`;
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

function abrirFormularioMatricula(id, nombre) {
    alert(`Iniciando matrícula para: ${nombre}`);
}

window.renderizarCursos = renderizarCursos;