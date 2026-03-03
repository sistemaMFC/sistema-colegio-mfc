/* ========================================================
   LÓGICA REAL DE CURSOS - CONECTADO A MYSQL
   ======================================================== */

async function renderizarCursos() {
    const contenedor = document.querySelector('.grid-cursos-mfc');
    if(!contenedor) return;

    // Ponemos un mensaje de carga para saber que el sistema está trabajando
    contenedor.innerHTML = `<p class="muted">Conectando con la base de datos de Railway...</p>`;

    try {
        // CORRECCIÓN DE RUTA: Ahora apunta a /admin/... que es donde está en su backend
        const respuesta = await api('/api/admin/cursos/estadisticas'); 
        
        const cursos = Array.isArray(respuesta) ? respuesta : [];
        
        contenedor.innerHTML = "";

        if (cursos.length === 0) {
            contenedor.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <p class="muted">No hay cursos en MySQL.</p>
                    <small>Verifique la tabla 'cursos' en su Workbench.</small>
                </div>`;
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
                        <span class="curso-detalle-mfc">Click para gestionar</span>
                    </div>
                </div>
            `;
        });

    } catch (err) {
        console.error("Error detallado:", err);
        contenedor.innerHTML = `
            <p class="danger">Error: No se pudo conectar con el servidor.</p>
            <small class="muted">Ruta intentada: /api/admin/cursos/estadisticas</small>
        `;
    }
}

function abrirFormularioMatricula(id, nombre) {
    alert(`Iniciando matrícula para: ${nombre} (ID: ${id})`);
}

// Hacemos la función disponible para app.js
window.renderizarCursos = renderizarCursos;