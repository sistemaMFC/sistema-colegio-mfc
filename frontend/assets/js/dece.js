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

async function loadDashboard() {
  const token = getToken();
  if (!token) return;

  try {
    const [dashboardRes, casosRes, atencionesRes] = await Promise.all([
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
      })
    ]);

    const dashboardData = await dashboardRes.json();
    const casosData = await casosRes.json();
    const atencionesData = await atencionesRes.json();

    if (!dashboardRes.ok || !casosRes.ok || !atencionesRes.ok) {
      throw new Error(dashboardData.error || casosData.error || atencionesData.error || 'No se pudo cargar DECE');
    }

    const stats = dashboardData.stats || {};
    document.getElementById('countAtenciones').textContent = stats.atencionesHoy ?? '0';
    document.getElementById('countCasos').textContent = stats.casosActivos ?? '0';
    document.getElementById('countSeguimientos').textContent = stats.seguimientosPendientes ?? '0';
    document.getElementById('countRemisiones').textContent = stats.remisionesDocentes ?? '0';

    renderCaseList(Array.isArray(casosData.casos) ? casosData.casos : []);
    renderAtenciones(Array.isArray(atencionesData.atenciones) ? atencionesData.atenciones : []);
  } catch (error) {
    console.error('DECE loadDashboard error:', error);
    document.getElementById('countAtenciones').textContent = '0';
    document.getElementById('countCasos').textContent = '0';
    document.getElementById('countSeguimientos').textContent = '0';
    document.getElementById('countRemisiones').textContent = '0';
    renderCaseList([]);
    renderAtenciones([]);
  }
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

const formAtencion = document.getElementById('formAtencion');
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

redirectIfUnauthorized();
loadDashboard();
