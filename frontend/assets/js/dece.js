function getUser() {
  try {
    return JSON.parse(localStorage.getItem('mfc_user') || 'null');
  } catch (err) {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('mfc_token');
}

function normalizeRoles(roles) {
  const list = Array.isArray(roles) ? roles : [roles || ''];
  return list.map(r => String(r || '').toUpperCase()).filter(Boolean);
}

function redirectIfUnauthorized() {
  const user = getUser();
  const roles = normalizeRoles(Array.isArray(user?.roles) ? user.roles : [user?.rol || '']);

  if (!getToken()) {
    window.location.href = './index.html';
    return;
  }

  const isAdmin = roles.includes('ADMIN') || roles.includes('ADMINISTRADOR');
  const isPsicologo = roles.includes('PSICOLOGO');

  if (!isAdmin && !isPsicologo) {
    window.location.href = './index.html';
  }
}

function renderCaseList(casos) {
  const container = document.getElementById('casosList');
  if (!container) return;

  if (!casos.length) {
    container.innerHTML = '<p>No hay casos registrados.</p>';
    return;
  }

  container.innerHTML = casos.map(caso => `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc;">
      <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap;">
        <strong>${caso.estudiante}</strong>
        <span style="padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700;">${caso.prioridad || 'MEDIA'}</span>
      </div>
      <p style="margin: 8px 0 0; color: #334155;">${caso.curso} · ${caso.estado || 'ACTIVO'}</p>
      <p style="margin: 6px 0 0; color: #475569;">${caso.motivo}</p>
      <small style="display: block; margin-top: 8px; color: #64748b;">Remitido por: ${caso.remitidoPor || 'Sin remisión'}</small>
    </div>
  `).join('');
}

function renderAtenciones(atenciones) {
  const container = document.getElementById('atencionesList');
  if (!container) return;

  if (!atenciones.length) {
    container.innerHTML = '<p>No hay atenciones registradas.</p>';
    return;
  }

  container.innerHTML = atenciones.map(item => `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc;">
      <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
        <strong>${item.estudiante}</strong>
        <span style="font-size: 12px; color: #0f172a; background: #e2e8f0; border-radius: 999px; padding: 4px 8px;">${item.tipo}</span>
      </div>
      <p style="margin: 8px 0; color: #475569;">${item.resumen}</p>
      <small style="color: #64748b;">${item.fecha} · ${item.responsable}</small>
    </div>
  `).join('');
}

function renderDocumentos(documentos) {
  const container = document.getElementById('documentosList');
  if (!container) return;
  if (!documentos.length) {
    container.innerHTML = '<p>No hay documentos registrados.</p>';
    return;
  }

  container.innerHTML = documentos.map(item => `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center;">
        <strong>${item.titulo}</strong>
        <span style="padding: 4px 8px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700;">${item.tipo}</span>
      </div>
      <p style="margin: 8px 0; color: #475569;">${item.descripcion || 'Sin descripción'}</p>
      <small style="color: #64748b;">${item.responsable || 'DECE'} · ${new Date(item.fecha_creacion).toLocaleDateString()}</small>
    </div>
  `).join('');
}

function renderActividades(actividades) {
  const container = document.getElementById('actividadesList');
  if (!container) return;
  if (!actividades.length) {
    container.innerHTML = '<p>No hay actividades registradas.</p>';
    return;
  }

  container.innerHTML = actividades.map(item => `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center;">
        <strong>${item.titulo}</strong>
        <span style="padding: 4px 8px; border-radius: 999px; background: #e0f2fe; color: #075985; font-size: 12px; font-weight: 700;">${item.estado || 'PLANIFICADA'}</span>
      </div>
      <p style="margin: 8px 0; color: #475569;">${item.descripcion || 'Sin descripción'}</p>
      <small style="color: #64748b;">${item.tipo || 'ACTIVIDAD'} · ${item.fecha} · ${item.responsable || 'DECE'}</small>
    </div>
  `).join('');
}

function renderDerivaciones(derivaciones) {
  const container = document.getElementById('derivacionesList');
  if (!container) return;
  if (!derivaciones.length) {
    container.innerHTML = '<p>No hay derivaciones registradas.</p>';
    return;
  }

  container.innerHTML = derivaciones.map(item => `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: #f8fafc; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center;">
        <strong>${item.estudiante}</strong>
        <span style="padding: 4px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700;">${item.estado || 'PENDIENTE'}</span>
      </div>
      <p style="margin: 8px 0; color: #475569;">${item.area} · ${item.tipo} · ${item.curso}</p>
      <p style="margin: 0; color: #334155;">${item.motivo}</p>
    </div>
  `).join('');
}

function renderReporteDocente(reporte) {
  const totalCasos = document.getElementById('repTotalCasos');
  const totalAtenciones = document.getElementById('repTotalAtenciones');
  const casosDocentes = document.getElementById('repCasosDocentes');

  if (totalCasos) totalCasos.textContent = reporte?.totalCasos ?? '0';
  if (totalAtenciones) totalAtenciones.textContent = reporte?.totalAtenciones ?? '0';
  if (casosDocentes) casosDocentes.textContent = reporte?.casosDocentes ?? '0';

  const prioridad = document.getElementById('repPrioridad');
  if (prioridad) {
    const items = Array.isArray(reporte?.prioridad) ? reporte.prioridad : [];
    prioridad.innerHTML = items.length ? items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e2e8f0;">
        <strong>${item.prioridad}</strong>
        <span style="font-weight:700; color:#0f172a;">${item.total}</span>
      </div>
    `).join('') : '<p>No hay datos.</p>';
  }

  const tipos = document.getElementById('repTipoAtencion');
  if (tipos) {
    const items = Array.isArray(reporte?.tiposAtencion) ? reporte.tiposAtencion : [];
    tipos.innerHTML = items.length ? items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e2e8f0;">
        <strong>${item.tipo}</strong>
        <span style="font-weight:700; color:#0f172a;">${item.total}</span>
      </div>
    `).join('') : '<p>No hay datos.</p>';
  }

  const origenes = document.getElementById('repOrigenes');
  if (origenes) {
    const items = Array.isArray(reporte?.origenes) ? reporte.origenes : [];
    origenes.innerHTML = items.length ? items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e2e8f0;">
        <strong>${item.origen}</strong>
        <span style="font-weight:700; color:#0f172a;">${item.total}</span>
      </div>
    `).join('') : '<p>No hay datos.</p>';
  }

  const porMes = document.getElementById('repPorMes');
  if (porMes) {
    const items = Array.isArray(reporte?.porMes) ? reporte.porMes : [];
    porMes.innerHTML = items.length ? items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e2e8f0;">
        <strong>${item.mes}</strong>
        <span style="font-weight:700; color:#0f172a;">${item.total}</span>
      </div>
    `).join('') : '<p>No hay datos.</p>';
  }
}

function renderViolencia(protocolos) {
  const container = document.getElementById('violenciaList');
  if (!container) return;

  if (!protocolos.length) {
    container.innerHTML = '<p>No hay protocolos de violencia registrados.</p>';
    return;
  }

  container.innerHTML = protocolos.map(item => `
    <div style="border:1px solid #fee2e2; border-radius:12px; padding:12px; background:#fff7ed; margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
        <strong>${item.estudiante}</strong>
        <span style="padding:4px 8px; border-radius:999px; background:#fecaca; color:#991b1b; font-size:12px; font-weight:700;">${item.estado || 'PENDIENTE'}</span>
      </div>
      <p style="margin:8px 0; color:#475569;">${item.curso} · ${item.tipo_incidente || 'INCIDENTE'} · ${item.nivel_riesgo || 'MEDIA'}</p>
      <p style="margin:0 0 6px; color:#334155;">${item.descripcion || 'Sin descripción'}</p>
      <small style="color:#64748b;">${item.acciones || 'Sin acciones registradas'} · ${item.responsable || 'DECE'}</small>
    </div>
  `).join('');
}

function renderNee(nee) {
  const container = document.getElementById('neeList');
  if (!container) return;

  if (!nee.length) {
    container.innerHTML = '<p>No hay registros de NEE.</p>';
    return;
  }

  container.innerHTML = nee.map(item => `
    <div style="border:1px solid #dbeafe; border-radius:12px; padding:12px; background:#f8fafc; margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
        <strong>${item.estudiante}</strong>
        <span style="padding:4px 8px; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:12px; font-weight:700;">${item.estado || 'ACTIVO'}</span>
      </div>
      <p style="margin:8px 0; color:#475569;">${item.curso} · ${item.tipo || 'NEE'} · ${item.nivel || 'MODERADO'}</p>
      <p style="margin:0 0 6px; color:#334155;">${item.descripcion || 'Sin descripción'}</p>
      <small style="color:#64748b;">${item.apoyo || 'Sin apoyo registrado'} · ${item.responsable || 'DECE'}</small>
    </div>
  `).join('');
}

async function loadDashboard() {
  const token = getToken();
  if (!token) return;

  try {
    const [dashboardRes, casosRes, atencionesRes, resumenRes, documentosRes, actividadesRes, derivacionesRes, reportesRes, violenciaRes, neeRes] = await Promise.all([
      fetch(`${window.location.origin}/api/dece/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${window.location.origin}/api/dece/casos`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${window.location.origin}/api/dece/atenciones`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${window.location.origin}/api/dece/gestion/resumen`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${window.location.origin}/api/dece/documentos`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${window.location.origin}/api/dece/actividades`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${window.location.origin}/api/dece/derivaciones`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${window.location.origin}/api/dece/reportes/docentes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${window.location.origin}/api/dece/violencia/protocolos`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${window.location.origin}/api/dece/nee`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    const dashboardData = await dashboardRes.json();
    const casosData = await casosRes.json();
    const atencionesData = await atencionesRes.json();
    const resumenData = await resumenRes.json();
    const documentosData = await documentosRes.json();
    const actividadesData = await actividadesRes.json();
    const derivacionesData = await derivacionesRes.json();
    const reportesData = await reportesRes.json();
    const violenciaData = await violenciaRes.json();
    const neeData = await neeRes.json();

    if (!dashboardRes.ok || !casosRes.ok || !atencionesRes.ok || !resumenRes.ok || !documentosRes.ok || !actividadesRes.ok || !derivacionesRes.ok || !reportesRes.ok || !violenciaRes.ok || !neeRes.ok) {
      throw new Error(dashboardData.error || casosData.error || atencionesData.error || resumenData.error || documentosData.error || actividadesData.error || derivacionesData.error || reportesData.error || violenciaData.error || neeData.error || 'No se pudo cargar DECE');
    }

    const stats = dashboardData.stats || {};
    const resumen = resumenData.resumen || {};
    document.getElementById('countAtenciones').textContent = stats.atencionesHoy ?? '0';
    document.getElementById('countCasos').textContent = stats.casosActivos ?? '0';
    document.getElementById('countSeguimientos').textContent = stats.seguimientosPendientes ?? '0';
    document.getElementById('countRemisiones').textContent = stats.remisionesDocentes ?? '0';
    document.getElementById('resDocumentos').textContent = resumen.documentos ?? '0';
    document.getElementById('resActividades').textContent = resumen.actividades ?? '0';
    document.getElementById('resTalleres').textContent = resumen.talleres ?? '0';
    document.getElementById('resFaltas').textContent = resumen.faltas ?? '0';

    renderCaseList(Array.isArray(casosData.casos) ? casosData.casos : []);
    renderAtenciones(Array.isArray(atencionesData.atenciones) ? atencionesData.atenciones : []);
    renderDocumentos(Array.isArray(documentosData.documentos) ? documentosData.documentos : []);
    renderActividades(Array.isArray(actividadesData.actividades) ? actividadesData.actividades : []);
    renderDerivaciones(Array.isArray(derivacionesData.derivaciones) ? derivacionesData.derivaciones : []);
    renderReporteDocente(reportesData.reporte || {});
    renderViolencia(Array.isArray(violenciaData.protocolos) ? violenciaData.protocolos : []);
    renderNee(Array.isArray(neeData.nee) ? neeData.nee : []);
  } catch (error) {
    console.error('DECE loadDashboard error:', error);
    document.getElementById('countAtenciones').textContent = '0';
    document.getElementById('countCasos').textContent = '0';
    document.getElementById('countSeguimientos').textContent = '0';
    document.getElementById('countRemisiones').textContent = '0';
    document.getElementById('resDocumentos').textContent = '0';
    document.getElementById('resActividades').textContent = '0';
    document.getElementById('resTalleres').textContent = '0';
    document.getElementById('resFaltas').textContent = '0';
    renderReporteDocente({
      totalCasos: 0,
      totalAtenciones: 0,
      casosDocentes: 0,
      prioridad: [],
      tiposAtencion: [],
      origenes: [],
      porMes: []
    });
    renderViolencia([]);
    renderNee([]);
    renderCaseList([]);
    renderAtenciones([]);
    renderDocumentos([]);
    renderActividades([]);
    renderDerivaciones([]);
  }
}

const formViolencia = document.getElementById('formViolenciaMain');
if (formViolencia) {
  formViolencia.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      window.location.href = './index.html';
      return;
    }

    const payload = {
      estudiante: document.getElementById('violEstudiante').value,
      curso: document.getElementById('violCurso').value,
      tipoIncidente: document.getElementById('violTipoIncidente').value,
      nivelRiesgo: document.getElementById('violNivelRiesgo').value,
      descripcion: document.getElementById('violDescripcion').value,
      acciones: document.getElementById('violAcciones').value,
      responsable: 'DECE',
      estado: 'PENDIENTE'
    };

    try {
      const response = await fetch(`${window.location.origin}/api/dece/violencia/protocolos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el protocolo');
      formViolencia.reset();
      await loadDashboard();
      alert('Protocolo de violencia registrado correctamente');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar el protocolo');
    }
  });
}

document.getElementById('btnVolverInicio').addEventListener('click', () => {
  const user = getUser();
  const roles = normalizeRoles(Array.isArray(user?.roles) ? user.roles : [user?.rol || '']);

  if (roles.includes('ADMIN') || roles.includes('ADMINISTRADOR')) {
    window.location.href = './app.html';
    return;
  }

  if (roles.includes('PROFESOR')) {
    window.location.href = './profesor-academico.html';
    return;
  }

  window.location.href = './index.html';
});

document.getElementById('btnCerrarSesion').addEventListener('click', () => {
  localStorage.removeItem('mfc_token');
  localStorage.removeItem('mfc_user');
  window.location.href = './index.html';
});

const formDocumento = document.getElementById('formDocumentoMain');
if (formDocumento) {
  formDocumento.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      window.location.href = './index.html';
      return;
    }

    const payload = {
      titulo: document.getElementById('docTitulo').value,
      tipo: document.getElementById('docTipo').value,
      responsable: document.getElementById('docResponsable').value,
      descripcion: document.getElementById('docDescripcion').value
    };

    try {
      const response = await fetch(`${window.location.origin}/api/dece/documentos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar el documento');
      formDocumento.reset();
      document.getElementById('docResponsable').value = 'DECE';
      await loadDashboard();
      alert('Documento registrado correctamente');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo registrar el documento');
    }
  });
}

const formActividad = document.getElementById('formActividadMain');
if (formActividad) {
  formActividad.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      window.location.href = './index.html';
      return;
    }

    const payload = {
      titulo: document.getElementById('actTitulo').value,
      tipo: document.getElementById('actTipo').value,
      fecha: document.getElementById('actFecha').value,
      responsable: document.getElementById('actResponsable').value,
      descripcion: document.getElementById('actDescripcion').value,
      estado: 'PLANIFICADA'
    };

    try {
      const response = await fetch(`${window.location.origin}/api/dece/actividades`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar la actividad');
      formActividad.reset();
      document.getElementById('actTipo').value = 'ACTIVIDAD';
      document.getElementById('actResponsable').value = 'DECE';
      await loadDashboard();
      alert('Actividad registrada correctamente');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo registrar la actividad');
    }
  });
}

const formDerivacion = document.getElementById('formDerivacionMain');
if (formDerivacion) {
  formDerivacion.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      window.location.href = './index.html';
      return;
    }

    const payload = {
      estudiante: document.getElementById('derivEstudiante').value,
      curso: document.getElementById('derivCurso').value,
      tipo: document.getElementById('derivTipo').value,
      area: document.getElementById('derivArea').value,
      motivo: document.getElementById('derivMotivo').value,
      estado: 'PENDIENTE'
    };

    try {
      const response = await fetch(`${window.location.origin}/api/dece/derivaciones`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la derivación');
      formDerivacion.reset();
      await loadDashboard();
      alert('Derivación registrada correctamente');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar la derivación');
    }
  });
}

const formAtencion = document.getElementById('formAtencionMain');
if (formAtencion) {
  formAtencion.addEventListener('submit', async (event) => {
    event.preventDefault();

    const token = getToken();
    if (!token) {
      window.location.href = './index.html';
      return;
    }

    const payload = {
      casoId: document.getElementById('atencionCasoId').value,
      estudiante: document.getElementById('atencionEstudiante').value,
      tipo: document.getElementById('atencionTipo').value,
      resumen: document.getElementById('atencionResumen').value
    };

    try {
      const response = await fetch(`${window.location.origin}/api/dece/atenciones`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la atención');

      formAtencion.reset();
      await loadDashboard();
      alert('Atención registrada correctamente');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar la atención');
    }
  });
}

const formNee = document.getElementById('formNeeMain');
if (formNee) {
  formNee.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      window.location.href = './index.html';
      return;
    }

    const payload = {
      estudiante: document.getElementById('neeEstudiante').value,
      curso: document.getElementById('neeCurso').value,
      tipo: document.getElementById('neeTipo').value,
      nivel: document.getElementById('neeNivel').value,
      descripcion: document.getElementById('neeDescripcion').value,
      apoyo: document.getElementById('neeApoyo').value,
      responsable: 'DECE',
      estado: 'ACTIVO'
    };

    try {
      const response = await fetch(`${window.location.origin}/api/dece/nee`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la necesidad educativa');
      formNee.reset();
      await loadDashboard();
      alert('Necesidad educativa registrada correctamente');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo guardar la necesidad educativa');
    }
  });
}

redirectIfUnauthorized();
loadDashboard();
