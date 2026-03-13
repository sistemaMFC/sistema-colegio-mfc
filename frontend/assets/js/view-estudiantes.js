/* ========================================================
    MÓDULO INDEPENDIENTE: GESTIÓN GLOBAL DE ESTUDIANTES
    Lógica de visualización, edición y cambio de curso
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
                            <button class="btn-soft btn-sm" onclick="verFichaCompleta('${est.id}')" title="Ver Información">👁️</button>
                            <button class="btn-soft btn-sm" onclick="generarCertificadoMatricula('${est.id}', '${est.nombre_curso || ''}')" ${!esActivo ? 'disabled' : ''} title="Certificado">📜</button>
                            <button class="btn-soft btn-sm" onclick="prepararEdicion('${est.id}')" title="Editar Ficha">✏️</button>
                            <button class="btn-soft btn-sm" onclick="solicitarCambioCurso('${est.id}', '${est.apellidos_est} ${est.nombres_est}')" title="Cambiar de Curso">🔄</button>
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

/* ========================================================
    NUEVAS FUNCIONES SOLICITADAS
   ======================================================== */

// 1. FUNCIÓN VER: Muestra toda la información del estudiante
async function verFichaCompleta(id) {
    try {
        const est = await api(`/api/students/${id}`);
        // Formateamos la fecha para que sea legible
        const fechaNac = est.fecha_nac ? new Date(est.fecha_nac).toLocaleDateString() : 'No registrada';
        
        // Usamos un alert estructurado para ver los datos
        alert(`
            📋 FICHA COMPLETA DEL ESTUDIANTE
            ------------------------------------------
            ESTUDIANTE: ${est.apellidos_est} ${est.nombres_est}
            CÉDULA: ${est.cedula_est}
            FECHA NAC: ${fechaNac}
            GÉNERO: ${est.genero || 'N/A'}
            DIRECCIÓN: ${est.direccion || 'N/A'}
            SECTOR: ${est.sector || 'N/A'}
            
            👤 INFORMACIÓN DEL REPRESENTANTE
            ------------------------------------------
            NOMBRE: ${est.nombre_rep || 'N/A'}
            CÉDULA REP: ${est.cedula_rep || 'N/A'}
            CELULAR: ${est.celular_rep || 'N/A'}
            PARENTESCO: ${est.parentesco_rep || 'N/A'}
            
            🎓 ESTADO ACADÉMICO
            ------------------------------------------
            ESTADO: ${est.estado}
            PERIODO: ${est.periodo || '2026-2027'}
        `);
    } catch (err) {
        alert("Error al obtener la ficha del estudiante.");
    }
}

// 2. FUNCIÓN CAMBIAR CURSO: Con protección de contraseña "SistemaMFC"
async function solicitarCambioCurso(id, nombreAlumno) {
    const pass = prompt(`🔐 SEGURIDAD: Ingrese la contraseña de administrador para cambiar el curso de ${nombreAlumno}:`);
    
    if (pass === "SistemaMFC") {
        const nuevoCursoId = prompt("Ingrese el ID del NUEVO CURSO (1: Inicial I, 2: Inicial II, 3: Primero EGB, etc):");
        
        if (nuevoCursoId && !isNaN(nuevoCursoId)) {
            try {
                const res = await api(`/api/students/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ curso_id: nuevoCursoId })
                });
                
                if (res.success) {
                    alert("✅ Curso actualizado exitosamente. Refrescando lista...");
                    listarEstudiantesGlobal(); 
                } else {
                    alert("❌ No se pudo actualizar el curso.");
                }
            } catch (err) {
                alert("❌ Error en la conexión al intentar cambiar el curso.");
            }
        } else if (nuevoCursoId !== null) {
            alert("⚠️ ID de curso no válido.");
        }
    } else if (pass !== null) {
        alert("🚫 Contraseña incorrecta. Acción denegada.");
    }
}

/* ========================================================
    EVENTOS DE BÚSQUEDA Y EXPOSICIÓN GLOBAL
   ======================================================== */

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

window.mostrarModuloEstudiantes = mostrarModuloEstudiantes;
window.listarEstudiantesGlobal = listarEstudiantesGlobal;
window.verFichaCompleta = verFichaCompleta;
window.solicitarCambioCurso = solicitarCambioCurso;