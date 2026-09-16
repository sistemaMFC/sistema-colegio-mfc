const moduleGrid = document.getElementById('moduleGrid');

function parseUser() {
  try {
    return JSON.parse(localStorage.getItem('mfc_user') || 'null');
  } catch (err) {
    return null;
  }
}

function getRoleList(user) {
  const direct = user?.roles || [];
  const base = user?.rol ? [user.rol] : [];
  return Array.from(new Set([...base, ...direct].map(r => String(r).toUpperCase())));
}

function getModules(user) {
  const roles = getRoleList(user);
  const modules = [];

  if (roles.includes('ADMIN') || roles.includes('ADMINISTRADOR')) {
    return [{ name: 'Administración', url: './app.html', icon: '🏛️', desc: 'Panel general del sistema' }];
  }
  if (roles.includes('PROFESOR')) {
    modules.push({ name: 'Profesor', url: './profesor-academico.html', icon: '🎓', desc: 'Gestión académica del docente' });
  }
  if (roles.includes('PSICOLOGO')) {
    modules.push({ name: 'DS', url: './dece.html', icon: '🧠', desc: 'Departamento de psicología y bienestar' });
  }

  return modules;
}

function renderModules() {
  const user = parseUser();
  if (!user) {
    window.location.href = './index.html';
    return;
  }

  const roles = getRoleList(user);
  if (roles.includes('ADMIN') || roles.includes('ADMINISTRADOR')) {
    window.location.href = './app.html';
    return;
  }

  const modules = getModules(user);
  if (!modules.length) {
    window.location.href = './index.html';
    return;
  }

  moduleGrid.innerHTML = modules.map(module => `
    <div class="module-card" data-url="${module.url}">
      <div class="icon">${module.icon}</div>
      <h2>${module.name}</h2>
      <p>${module.desc}</p>
      <button type="button">Entrar</button>
    </div>
  `).join('');

  moduleGrid.querySelectorAll('.module-card').forEach(card => {
    card.addEventListener('click', () => {
      const url = card.dataset.url;
      if (url) window.location.href = url;
    });
  });
}

renderModules();
