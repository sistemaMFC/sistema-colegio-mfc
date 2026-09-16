const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeRoles, hasAnyRole } = require('../src/utils/roles');

test('normalizeRoles keeps legacy single role and adds multi-role support', () => {
  assert.deepEqual(normalizeRoles('ADMIN', ['ADMIN', 'PSICOLOGO']), ['ADMIN', 'PSICOLOGO']);
  assert.deepEqual(normalizeRoles('PROFESOR', []), ['PROFESOR']);
});

test('hasAnyRole works with multiple roles', () => {
  assert.equal(hasAnyRole({ roles: ['PROFESOR', 'PSICOLOGO'] }, ['PSICOLOGO']), true);
  assert.equal(hasAnyRole({ roles: ['ADMIN'] }, ['PROFESOR', 'PSICOLOGO']), false);
});
