/* ========================================================
    MÓDULO INDEPENDIENTE: GESTIÓN GLOBAL DE ESTUDIANTES
    Lógica separada para no saturar otros archivos
   ======================================================== */

async function mostrarModuloEstudiantes() {
    // 1. Actualizamos encabezados de la página
    document.getElementById('pageTitle').textContent = "Gestión de Estudiantes";
    document.getElementById('pageSubtitle').textContent = "Base de datos completa: Activos e Inactivos";

    // 2. Ocultamos todas las vistas y mostramos solo la de estudiantes
    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    const vistaEstudiantes = document.getElementById('view-estudiantes');
    vistaEstudiantes.hidden = false;

    // 3. Dibujamos la estructura dentro del contenedor que dejamos en el HTML
    const contenedor = document.getElementById('contenedor-estudiantes-global');
    contenedor.innerHTML = `
        <div class="card">
            <div class="card-head d-flex justify-content-between align-items-center">
                <h3>Listado Maestro de Alumnos</h3>
                <div class="d-flex gap-2">
                    <input type="text" id="inputBuscarEstudianteGlobal" class="form-control" placeholder="🔍 Buscar nombre o cédula..." style="width: 300px;">
                    <button class="btn-soft" onclick="listarEstudiantesGlobal()">🔄 Refrescar</button>
                </div>
            </div>
            
            <div class="table-wrap" style="margin-top: 20px;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Cédula</th>
                            <th>Estudiante (Apellidos, Nombres)</th>
                            <th>Estado</th>
                            <th>Curso Actual</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="listaEstudiantesGlobalCuerpo">
                        <tr><td colspan="5" class="text-center">⏳ Consultando base de datos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 4. Cargamos los datos reales
    listarEstudiantesGlobal();
}

async function listarEstudiantesGlobal() {
    try {
        // Llamada a la API (que ahora trae el nombre_curso gracias al JOIN)
        const estudiantes = await api('/api/students');
        const tbody = document.getElementById('listaEstudiantesGlobalCuerpo');
        
        if (!estudiantes || estudiantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay estudiantes registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = estudiantes.map(est => {
            const esActivo = est.estado === 'ACTIVO';
            const badgeClase = esActivo ? 'badge ok' : 'badge warn';
            const estadoTxt = esActivo ? 'MATRICULADO' : 'PRE-MATRÍCULA';

            return `
                <tr>
                    <td>${est.cedula_est}</td>
                    <td style="font-weight:bold; text-transform:uppercase;">${est.apellidos_est}, ${est.nombres_est}</td>
                    <td><span class="${badgeClase}">${estadoTxt}</span></td>
                    <td>${est.nombre_curso || '<em class="muted">Sin curso</em>'}</td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn-soft btn-sm" onclick="generarCertificadoMatricula('${est.id}', '${est.nombre_curso || ''}')" ${!esActivo ? 'disabled' : ''} title="Certificado">
                                📜
                            </button>
                            <button class="btn-soft btn-sm" onclick="prepararEdicion('${est.id}')" title="Editar Ficha">
                                ✏️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error("Error en módulo estudiantes:", err);
        const tbody = document.getElementById('listaEstudiantesGlobalCuerpo');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al conectar con el servidor.</td></tr>';
    }
}

// Lógica de búsqueda en tiempo real (Escucha el input de búsqueda global)
document.addEventListener('input', (e) => {
    if (e.target.id === 'inputBuscarEstudianteGlobal') {
        const busqueda = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#listaEstudiantesGlobalCuerpo tr');
        
        filas.forEach(fila => {
            const textoFila = fila.innerText.toLowerCase();
            fila.style.display = textoFila.includes(busqueda) ? '' : 'none';
        });
    }
});

// Exponer funciones al objeto global (window) para que el HTML las vea
window.mostrarModuloEstudiantes = mostrarModuloEstudiantes;
window.listarEstudiantesGlobal = listarEstudiantesGlobal;