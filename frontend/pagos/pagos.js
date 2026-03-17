/* ========================================================
    MÓDULO DE PAGOS - COLEGIO MFC (FRONTEND)
    Lógica de búsqueda, Inscripción, Matrícula y Pensiones
   ======================================================== */

console.log("✅ Motor de Pagos cargado.");

/**
 * 1. Inicializa la vista principal del módulo de pagos
 */
async function inicializarModuloPagos() {
    const contenedor = document.getElementById('contenedor-pago-modulo');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="card" style="border-top: 4px solid #43e97b;">
            <div class="card-head d-flex justify-content-between align-items-center">
                <div>
                    <h3>💰 Gestión de Colecturía</h3>
                    <p class="muted">Inscripciones, Matrículas y Pensiones</p>
                </div>
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
                        <p>Busque un estudiante para gestionar sus pagos.</p>
                    </div>
                </div>
            </div>
        </div>

        <div id="panelDetallePago" class="grid-2 mt-4" style="display:none;">
            </div>
    `;

    const inputBusqueda = document.getElementById('inputBuscarAlumnoPago');
    inputBusqueda.addEventListener('input', e => {
        const valor = e.target.value.trim();
        if (valor.length > 2) {
            buscarAlumnoParaPago(valor);
        }
    });
}

/**
 * 2. Busca alumnos en tiempo real
 */
async function buscarAlumnoParaPago(criterio) {
    const display = document.getElementById('resultadoBusquedaPagos');
    
    try {
        const estudiantes = await api('/api/students'); 
        const filtrados = estudiantes.filter(est => 
            est.cedula_est.includes(criterio) || 
            `${est.apellidos_est} ${est.nombres_est}`.toLowerCase().includes(criterio.toLowerCase())
        );

        if (filtrados.length === 0) {
            display.innerHTML = `<div class="alert alert-warning">No se encontró al estudiante "${criterio}"</div>`;
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
                        ${filtrados.map(est => `
                            <tr>
                                <td>${est.cedula_est}</td>
                                <td style="text-transform:uppercase;"><strong>${est.apellidos_est}, ${est.nombres_est}</strong></td>
                                <td><span class="badge ${est.estado === 'ACTIVO' ? 'ok' : 'warn'}">${est.estado}</span></td>
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
        console.error("Error en búsqueda:", err);
    }
}

/**
 * 3. Carga la ficha de cobro del alumno
 */
async function cargarEstadoCuenta(estudianteId) {
    const panel = document.getElementById('panelDetallePago');
    const displayBusqueda = document.getElementById('resultadoBusquedaPagos');
    
    displayBusqueda.innerHTML = `<div class="text-center p-3">⏳ Obteniendo información financiera...</div>`;
    
    try {
        const est = await api(`/api/students/${estudianteId}`);
        
        panel.style.display = 'grid';
        displayBusqueda.innerHTML = `
            <div class="alert alert-success d-flex justify-content-between align-items-center mb-0">
                <span>Trámite para: <strong>${est.apellidos_est} ${est.nombres_est}</strong></span>
                <button class="btn btn-sm btn-dark" onclick="inicializarModuloPagos()">Volver a buscar</button>
            </div>
        `;

        panel.innerHTML = `
            <div class="card">
                <div class="card-head"><h4>👤 Información de Facturación</h4></div>
                <div class="card-body">
                    <p><strong>Representante:</strong> ${est.nombre_rep || 'S/I'}</p>
                    <p><strong>Cédula RUC:</strong> ${est.cedula_rep || 'S/I'}</p>
                    <p><strong>Teléfono:</strong> ${est.celular_rep || 'S/I'}</p>
                    <hr>
                    <div class="form-group">
                        <label>Concepto a Cobrar</label>
                        <select id="conceptoSeleccionado" class="form-select" onchange="cambiarVistaConcepto(this.value, '${est.id}')">
                            <option value="pension" selected>📅 Pensión Mensual (Estudiantes Matriculados)</option>
                            <option value="inscripcion">📝 Inscripción (Estudiantes Nuevos)</option>
                            <option value="matricula">🧾 Matrícula (Derecho a Cupo)</option>
                            <option value="otros">🎟 Otros Servicios</option>
                        </select>
                    </div>
                    <div id="area-monto-fijo" class="mt-3" style="display:none;">
                        <label>Valor del Trámite ($)</label>
                        <input type="number" id="montoConceptoFijo" class="form-control" step="0.01" placeholder="0.00">
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-head"><h4>💰 Control de Valores</h4></div>
                <div class="card-body">
                    <div id="contenedor-dinamico-pagos">
                        <div class="grid-meses-pagos">
                            <div class="alert alert-info text-center w-100">
                                Cargando cronograma de pensiones...
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn-cobrar-principal w-100 mt-3" onclick="confirmarTransaccion('${est.id}')">
                        PROCESAR PAGO Y GENERAR RECIBO
                    </button>
                </div>
            </div>
        `;
        
        // Iniciamos por defecto cargando pensiones si está matriculado
        cambiarVistaConcepto('pension', estudianteId);

    } catch (err) {
        alert("Error al cargar la ficha del alumno.");
    }
}

/**
 * 4. Cambia la interfaz entre Inscripción/Matrícula y Pensiones
 */
function cambiarVistaConcepto(valor, estudianteId) {
    const contenedor = document.getElementById('contenedor-dinamico-pagos');
    const areaMonto = document.getElementById('area-monto-fijo');

    if (valor === 'inscripcion' || valor === 'matricula' || valor === 'otros') {
        // Para pagos únicos: Inscripción o Matrícula
        areaMonto.style.display = 'block';
        contenedor.innerHTML = `
            <div class="alert alert-warning">
                <h5 class="mb-2">⚠️ Pago Único</h5>
                <p>Usted está cobrando la <strong>${valor.toUpperCase()}</strong>.</p>
                <small>Este valor no afecta el cronograma mensual de pensiones.</small>
            </div>
        `;
    } else {
        // Para Pensiones: Mostrar semáforo
        areaMonto.style.display = 'none';
        areaMonto.querySelector('input').value = "";
        cargarSemaforoPensiones(estudianteId);
    }
}

/**
 * 5. Carga el semáforo de colores de los meses (Próximo paso con Backend)
 */
async function cargarSemaforoPensiones(id) {
    const contenedor = document.getElementById('contenedor-dinamico-pagos');
    // Simulación de meses hasta conectar con Backend
    const meses = ["MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC", "ENE", "FEB"];
    
    contenedor.innerHTML = `
        <div class="grid-meses-pagos">
            ${meses.map(m => `
                <div class="mes-pago-card pendiente" onclick="this.classList.toggle('seleccionado')">
                    <span class="mes-name">${m}</span>
                    <span class="mes-status">$40.00</span>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * 6. Registra el pago (Envío al Backend)
 */
function confirmarTransaccion(id) {
    const concepto = document.getElementById('conceptoSeleccionado').value;
    const monto = document.getElementById('montoConceptoFijo').value;
    
    if ((concepto === 'inscripcion' || concepto === 'matricula') && !monto) {
        return showAlert('bad', "Debe ingresar el monto del cobro");
    }

    console.log(`Registrando ${concepto} para estudiante ${id}`);
    alert("Procesando pago... (Esperando conexión con Backend)");
}

// Exponer funciones al scope global
window.inicializarModuloPagos = inicializarModuloPagos;
window.cargarEstadoCuenta = cargarEstadoCuenta;
window.cambiarVistaConcepto = cambiarVistaConcepto;
window.confirmarTransaccion = confirmarTransaccion;