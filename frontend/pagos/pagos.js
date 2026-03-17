/* ========================================================
    MÓDULO DE PAGOS - COLEGIO MFC (FRONTEND)
    Lógica de búsqueda, visualización de deuda y cobro
   ======================================================== */

console.log("✅ Motor de Pagos cargado.");

// Función principal que se llama desde app.js
async function inicializarModuloPagos() {
    const contenedor = document.getElementById('contenedor-pago-modulo');
    if (!contenedor) return;

    // 1. Dibujamos la interfaz base (Buscador y Paneles vacíos)
    contenedor.innerHTML = `
        <div class="card" style="border-top: 4px solid #43e97b;">
            <div class="card-head d-flex justify-content-between align-items-center">
                <h3>💰 Gestión de Colecturía</h3>
                <div class="search-box-pagos">
                    <input type="text" id="inputBuscarAlumnoPago" class="form-control" 
                           placeholder="🔍 Buscar por cédula o apellido..." 
                           style="width: 350px; border-radius: 20px;">
                </div>
            </div>
            
            <div class="card-body">
                <div id="resultadoBusquedaPagos" class="mt-3">
                    <div class="text-center muted p-5">
                        <span style="font-size: 3rem;">🔎</span>
                        <p>Ingrese los datos del estudiante para consultar saldos.</p>
                    </div>
                </div>
            </div>
        </div>

        <div id="panelDetallePago" class="grid-2 mt-4" style="display:none;">
            </div>
    `;

    // 2. Escuchador de eventos para la búsqueda en tiempo real
    const inputBusqueda = document.getElementById('inputBuscarAlumnoPago');
    inputBusqueda.addEventListener('input', e => {
        const valor = e.target.value.trim();
        if (valor.length > 3) {
            buscarAlumnoParaPago(valor);
        }
    });
}

// Función para buscar alumnos en la base de datos
async function buscarAlumnoParaPago(criterio) {
    const display = document.getElementById('resultadoBusquedaPagos');
    
    try {
        // Reutilizamos el endpoint de estudiantes que ya tienes
        const estudiantes = await api('/api/students'); 
        const filtrados = estudiantes.filter(est => 
            est.cedula_est.includes(criterio) || 
            `${est.apellidos_est} ${est.nombres_est}`.toLowerCase().includes(criterio.toLowerCase())
        );

        if (filtrados.length === 0) {
            display.innerHTML = `<div class="alert alert-warning">No se encontraron estudiantes con "${criterio}"</div>`;
            return;
        }

        display.innerHTML = `
            <div class="table-wrap">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Cédula</th>
                            <th>Estudiante</th>
                            <th>Curso</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtrados.map(est => `
                            <tr>
                                <td>${est.cedula_est}</td>
                                <td>${est.apellidos_est}, ${est.nombres_est}</td>
                                <td>${est.nombre_curso || 'No matriculado'}</td>
                                <td>
                                    <button class="btn-soft btn-sm" onclick="cargarEstadoCuenta('${est.id}')">
                                        Seleccionar ✅
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        console.error("Error en búsqueda de pagos:", err);
    }
}

// Función para cargar los meses y deudas del alumno seleccionado
async function cargarEstadoCuenta(estudianteId) {
    const panel = document.getElementById('panelDetallePago');
    const displayBusqueda = document.getElementById('resultadoBusquedaPagos');
    
    // Ocultamos la búsqueda y mostramos el panel de cobro
    displayBusqueda.innerHTML = `<div class="text-center p-3">⏳ Cargando estado de cuenta...</div>`;
    
    try {
        const est = await api(`/api/students/${estudianteId}`);
        
        panel.style.display = 'grid';
        displayBusqueda.innerHTML = `
            <div class="alert alert-success d-flex justify-content-between align-items-center">
                <span>Estudiante seleccionado: <strong>${est.apellidos_est} ${est.nombres_est}</strong></span>
                <button class="btn btn-sm btn-outline-dark" onclick="inicializarModuloPagos()">Cambiar Estudiante</button>
            </div>
        `;

        panel.innerHTML = `
            <div class="card">
                <div class="card-head"><h4>👤 Información de Facturación</h4></div>
                <div class="card-body">
                    <p><strong>Representante:</strong> ${est.nombre_rep || 'N/A'}</p>
                    <p><strong>Cédula:</strong> ${est.cedula_rep || 'N/A'}</p>
                    <p><strong>Teléfono:</strong> ${est.celular_rep || 'N/A'}</p>
                    <hr>
                    <div class="form-group">
                        <label>Concepto de Pago</label>
                        <select id="conceptoSeleccionado" class="form-control">
                            <option value="pension">Pensión Mensual</option>
                            <option value="matricula">Matrícula</option>
                            <option value="otros">Otros Servicios</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-head"><h4>📅 Control de Pensiones</h4></div>
                <div class="card-body">
                    <div class="grid-meses-pagos">
                        <div class="alert alert-info text-center">
                            Conectando con el historial de pagos...
                        </div>
                    </div>
                    <button class="btn w-100 mt-3" style="background:#43e97b; color:white; font-weight:bold;">
                        REGISTRAR PAGO SELECCIONADO
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        alert("Error al cargar detalle del alumno.");
    }
}

// Exponer al sistema global
window.inicializarModuloPagos = inicializarModuloPagos;
window.cargarEstadoCuenta = cargarEstadoCuenta;