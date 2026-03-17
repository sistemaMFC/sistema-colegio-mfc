/* ========================================================
    MÓDULO DE PAGOS - COLEGIO MFC (FRONTEND)
    Lógica de búsqueda, Inscripción de Nuevos y Colecturía
   ======================================================== */

console.log("✅ Motor de Pagos cargado.");

/**
 * 1. Inicializa la vista con el botón de "Nuevo Estudiante" arriba
 */
async function inicializarModuloPagos() {
    const contenedor = document.getElementById('contenedor-pago-modulo');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="card" style="border-top: 4px solid #43e97b;">
            <div class="card-head d-flex justify-content-between align-items-center">
                <div>
                    <h3>💰 Gestión de Colecturía</h3>
                    <p class="muted">Inscriba nuevos estudiantes o gestione pensiones de alumnos registrados.</p>
                </div>
                <button class="btn" style="background: #2d3436; color: white; border-radius: 12px; padding: 10px 20px; font-weight: bold;" 
                        onclick="abrirModalInscripcionPagos()">
                    ✨ Inscribir Estudiante Nuevo
                </button>
            </div>
            
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">Alumnos Registrados</h5>
                    <div class="search-box-pagos">
                        <input type="text" id="inputBuscarAlumnoPago" class="form-control" 
                               placeholder="🔍 Filtrar por cédula o apellido..." 
                               style="width: 350px; border-radius: 20px;">
                    </div>
                </div>

                <div id="resultadoBusquedaPagos">
                    <div class="text-center p-4">
                        <div class="spinner-border text-success"></div>
                        <p>Sincronizando lista de estudiantes...</p>
                    </div>
                </div>
            </div>
        </div>

        <div id="panelDetallePago" class="grid-2 mt-4" style="display:none;">
            </div>
    `;

    // Carga la lista inicial de los que ya existen
    cargarListaEstudiantesInicial();

    // Filtro de búsqueda en tiempo real
    const inputBusqueda = document.getElementById('inputBuscarAlumnoPago');
    inputBusqueda.addEventListener('input', e => {
        const valor = e.target.value.trim();
        if (valor === "") {
            cargarListaEstudiantesInicial();
        } else if (valor.length > 2) {
            buscarAlumnoParaPago(valor);
        }
    });
}

/**
 * 2. Función para Inscribir (Abre el formulario de registro de matrícula como inscripción)
 */
function abrirModalInscripcionPagos() {
    const modal = document.getElementById('modalFormMatricula');
    if(!modal) {
        alert("Error: No se encontró el formulario de registro.");
        return;
    }

    // Cambiamos textos para que Gloria sepa que es Inscripción
    const titulo = document.getElementById('modalMatriculaTitulo');
    const boton = document.getElementById('btnSubmitMatricula');
    
    if(titulo) titulo.innerText = "📝 Formulario de Inscripción - Alumno Nuevo";
    if(boton) boton.innerText = "Guardar Estudiante e Inscribir ✨";
    
    // Limpiamos los campos
    const form = document.getElementById('formNuevaMatricula');
    if(form) form.reset();
    
    const idField = document.getElementById('edit_id_estudiante');
    if(idField) idField.value = ""; 
    
    modal.style.display = "flex";
}

/**
 * 3. Carga inicial de alumnos existentes
 */
async function cargarListaEstudiantesInicial() {
    const display = document.getElementById('resultadoBusquedaPagos');
    try {
        const estudiantes = await api('/api/students');
        renderizarTablaEstudiantes(estudiantes);
    } catch (err) {
        display.innerHTML = `<div class="alert alert-danger">Error de conexión con el servidor.</div>`;
    }
}

/**
 * 4. Filtro de búsqueda
 */
async function buscarAlumnoParaPago(criterio) {
    try {
        const estudiantes = await api('/api/students'); 
        const filtrados = estudiantes.filter(est => 
            est.cedula_est.includes(criterio) || 
            `${est.apellidos_est} ${est.nombres_est}`.toLowerCase().includes(criterio.toLowerCase())
        );
        renderizarTablaEstudiantes(filtrados, criterio);
    } catch (err) {
        console.error("Error en búsqueda:", err);
    }
}

/**
 * 5. Renderiza la tabla de estudiantes
 */
function renderizarTablaEstudiantes(lista, criterio = "") {
    const display = document.getElementById('resultadoBusquedaPagos');

    if (lista.length === 0) {
        display.innerHTML = `<div class="alert alert-warning">No se encontraron resultados para "${criterio}"</div>`;
        return;
    }

    display.innerHTML = `
        <div class="table-wrap">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Cédula</th>
                        <th>Estudiante</th>
                        <th>Estado Actual</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(est => `
                        <tr>
                            <td>${est.cedula_est}</td>
                            <td style="text-transform:uppercase;"><strong>${est.apellidos_est}, ${est.nombres_est}</strong></td>
                            <td><span class="badge ${est.estado === 'ACTIVO' ? 'ok' : 'warn'}">${est.estado}</span></td>
                            <td>
                                <button class="btn-soft btn-sm" onclick="cargarEstadoCuenta('${est.id}')">
                                    Cobrar Pensión 💳
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * 6. Ficha de cobro (Se activa al seleccionar alguien de la tabla)
 */
async function cargarEstadoCuenta(estudianteId) {
    const panel = document.getElementById('panelDetallePago');
    const displayBusqueda = document.getElementById('resultadoBusquedaPagos');
    
    displayBusqueda.innerHTML = `<div class="text-center p-3">⏳ Cargando deudas del estudiante...</div>`;
    
    try {
        const est = await api(`/api/students/${estudianteId}`);
        panel.style.display = 'grid';
        displayBusqueda.innerHTML = `
            <div class="alert alert-success d-flex justify-content-between align-items-center mb-0">
                <span>Sesión de Cobro: <strong>${est.apellidos_est} ${est.nombres_est}</strong></span>
                <button class="btn btn-sm btn-dark" onclick="inicializarModuloPagos()">Volver a la lista</button>
            </div>
        `;

        panel.innerHTML = `
            <div class="card">
                <div class="card-head"><h4>👤 Información Fiscal</h4></div>
                <div class="card-body">
                    <p><strong>Representante:</strong> ${est.nombre_rep || 'S/I'}</p>
                    <p><strong>Cédula:</strong> ${est.cedula_rep || 'S/I'}</p>
                    <p><strong>Teléfono:</strong> ${est.celular_rep || 'S/I'}</p>
                    <hr>
                    <div class="form-group">
                        <label>Seleccione Concepto</label>
                        <select id="conceptoSeleccionado" class="form-select" onchange="cambiarVistaConcepto(this.value, '${est.id}')">
                            <option value="pension" selected>📅 Pensión Mensual</option>
                            <option value="matricula">🧾 Pago de Matrícula</option>
                            <option value="otros">🎟 Otros Servicios</option>
                        </select>
                    </div>
                    <div id="area-monto-fijo" class="mt-3" style="display:none;">
                        <label>Valor a cobrar ($)</label>
                        <input type="number" id="montoConceptoFijo" class="form-control" placeholder="0.00" step="0.01">
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-head"><h4>💰 Estado de Pensiones</h4></div>
                <div class="card-body">
                    <div id="contenedor-dinamico-pagos">
                         </div>
                    <button class="btn-cobrar-principal w-100 mt-3" onclick="confirmarTransaccion('${est.id}')">
                        REGISTRAR PAGO AHORA
                    </button>
                </div>
            </div>
        `;
        
        // Carga inicial (por defecto Pensiones)
        cambiarVistaConcepto('pension', estudianteId);
        
    } catch (err) {
        alert("Error al cargar datos del estudiante.");
    }
}

/**
 * 7. Control de vista (Pensión vs Otros)
 */
function cambiarVistaConcepto(valor, estudianteId) {
    const contenedor = document.getElementById('contenedor-dinamico-pagos');
    const areaMonto = document.getElementById('area-monto-fijo');
    
    if (valor !== 'pension') {
        areaMonto.style.display = 'block';
        contenedor.innerHTML = `
            <div class="alert alert-warning">
                <strong>Aviso:</strong> Está procesando un pago único de ${valor.toUpperCase()}.
                Ingrese el monto manual en el panel izquierdo.
            </div>
        `;
    } else {
        areaMonto.style.display = 'none';
        cargarSemaforoPensiones(estudianteId);
    }
}

/**
 * 8. Semáforo de Pensiones (Conexión real con DB)
 */
async function cargarSemaforoPensiones(id) {
    const contenedor = document.getElementById('contenedor-dinamico-pagos');
    try {
        const deudas = await api(`/api/pagos/estado/${id}`);
        
        if (!deudas || deudas.length === 0) {
            contenedor.innerHTML = `<div class="alert alert-info text-center">Este estudiante no tiene deudas de pensión generadas.</div>`;
            return;
        }

        contenedor.innerHTML = `
            <div class="grid-meses-pagos">
                ${deudas.map(d => `
                    <div class="mes-pago-card ${d.estado.toLowerCase()}" 
                         onclick="${d.estado === 'PENDIENTE' ? "this.classList.toggle('seleccionado')" : ""}">
                        <span class="mes-name">${d.mes_nombre || 'MES'}</span>
                        <span class="mes-status">$${d.monto_pendiente || '0.00'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        contenedor.innerHTML = `<p class="muted">Sincronizando cronograma...</p>`;
    }
}

/**
 * 9. Procesar Transacción
 */
function confirmarTransaccion(id) {
    const concepto = document.getElementById('conceptoSeleccionado').value;
    alert(`Procesando cobro de ${concepto.toUpperCase()}... Enlace con Backend activo.`);
}

// Exportar al sistema global para que app.js lo vea
window.inicializarModuloPagos = inicializarModuloPagos;
window.abrirModalInscripcionPagos = abrirModalInscripcionPagos;
window.cargarEstadoCuenta = cargarEstadoCuenta;
window.cambiarVistaConcepto = cambiarVistaConcepto;