/* ========================================================
    MÓDULO INDEPENDIENTE: GESTIÓN GLOBAL DE ESTUDIANTES
    Lógica separada para no saturar otros archivos
   ======================================================== */

async function mostrarModuloEstudiantes() {
    // 1. Cambiamos el título y subtítulo de la página
    document.getElementById('pageTitle').textContent = "Gestión de Estudiantes";
    document.getElementById('pageSubtitle').textContent = "Listado completo de alumnos Activos y Pre-matriculados";

    // 2. Ocultamos todas las "views" actuales para limpiar la pantalla
    document.querySelectorAll('.view').forEach(v => v.hidden = true);

    // 3. Obtenemos el contenedor principal y dibujamos la estructura
    const mainContent = document.querySelector('main.content');
    
    // Si ya existe la sección de estudiantes la limpiamos, si no, la creamos
    let section = document.getElementById('view-estudiantes-global');
    if (!section) {
        section = document.createElement('section');
        section.id = 'view-estudiantes-global';
        section.className = 'view';
        mainContent.appendChild(section);
    }
    
    section.hidden = false;
    section.innerHTML = `
        <div class="card">
            <div class="card-head d-flex justify-content-between align-items-center">
                <h3>Base de Datos de Alumnos</h3>
                <div class="d-flex gap-2">
                    <input type="text" id="busquedaGlobal" class="form-control" placeholder="🔍 Buscar nombre o cédula..." style="width: 300px;">
                    <button class="btn-soft" onclick="renderizarTablaEstudiantes()">🔄 Refrescar</button>
                </div>
            </div>
            
            <div class="table-wrap" style="margin-top: 20px;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Cédula</th>
                            <th>Estudiante (Apellidos, Nombres)</th>
                            <th>Estado</th>
                            <th>Curso / Nivel</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="listaGlobalCuerpo">
                        <tr><td colspan="5" class="text-center">⏳ Cargando información...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 4. Cargamos los datos
    renderizarTablaEstudiantes();
}

async function renderizarTablaEstudiantes() {
    try {
        const estudiantes = await api('/api/students');
        const tbody = document.getElementById('listaGlobalCuerpo');
        tbody.innerHTML = "";

        estudiantes.forEach(est => {
            // Definimos el estado: Activo (Matriculado) o Inactivo (Pre-matriculado)
            const esActivo = est.estado === 'ACTIVO';
            const badgeClase = esActivo ? 'badge ok' : 'badge warn';
            const estadoTxt = esActivo ? 'MATRICULADO' : 'PRE-MATRÍCULA';

            tbody.innerHTML += `
                <tr>
                    <td>${est.cedula_est}</td>
                    <td style="font-weight:bold; text-transform:uppercase;">${est.apellidos_est}, ${est.nombres_est}</td>
                    <td><span class="${badgeClase}">${estadoTxt}</span></td>
                    <td>${est.nombre_curso || '<em class="muted">Sin asignar</em>'}</td>
                    <td>
                        <button class="btn-soft btn-sm" onclick="generarCertificadoMatricula('${est.id}', '${est.nombre_curso || ''}')" ${!esActivo ? 'disabled' : ''} title="Certificado">
                            📜
                        </button>
                        <button class="btn-soft btn-sm" onclick="prepararEdicion('${est.id}')" title="Editar">
                            ✏️
                        </button>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error al cargar estudiantes:", err);
    }
}

// Escuchar la búsqueda global
document.addEventListener('input', (e) => {
    if (e.target.id === 'busquedaGlobal') {
        const busqueda = e.target.value.toLowerCase();
        const filas = document.querySelectorAll('#listaGlobalCuerpo tr');
        filas.forEach(fila => {
            const texto = fila.innerText.toLowerCase();
            fila.style.display = texto.includes(busqueda) ? '' : 'none';
        });
    }
});

// Hacer la función accesible globalmente
window.mostrarModuloEstudiantes = mostrarModuloEstudiantes;