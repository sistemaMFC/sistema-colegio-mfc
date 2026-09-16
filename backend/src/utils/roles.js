function normalizeRoles(primaryRole, extraRoles = []) {
  const roles = new Set();

  if (primaryRole) roles.add(String(primaryRole).toUpperCase());

  for (const role of extraRoles || []) {
    if (role) roles.add(String(role).toUpperCase());
  }

  return Array.from(roles);
}

function hasRole(user, role) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const legacyRole = user?.rol ? String(user.rol).toUpperCase() : null;
  const target = String(role).toUpperCase();
  return roles.includes(target) || legacyRole === target;
}

function hasAnyRole(user, roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return false;

  return roles.some(role => hasRole(user, role));
}

module.exports = {
  normalizeRoles,
  hasRole,
  hasAnyRole,
};
