const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { requireAnyRole } = require('../src/middlewares/auth');
const deceRoutes = require('../src/routes/dece.routes');

test('DECE routes expose dashboard endpoints for authorized roles', () => {
  const hasDashboardRoute = deceRoutes.stack.some(layer => layer.route && layer.route.path === '/dashboard');
  const hasCasosRoute = deceRoutes.stack.some(layer => layer.route && layer.route.path === '/casos');
  const hasAtencionesRoute = deceRoutes.stack.some(layer => layer.route && layer.route.path === '/atenciones');

  assert.equal(hasDashboardRoute, true);
  assert.equal(hasCasosRoute, true);
  assert.equal(hasAtencionesRoute, true);
});

test('requireAnyRole allows DECE roles and denies others', () => {
  let nextCalled = false;
  const reqAllowed = { user: { roles: ['PSICOLOGO'] } };
  const resAllowed = { status: () => ({ json: () => {} }) };
  const next = () => { nextCalled = true; };

  requireAnyRole(['ADMIN', 'PSICOLOGO'])(reqAllowed, resAllowed, next);
  assert.equal(nextCalled, true);

  let blocked = false;
  const reqBlocked = { user: { roles: ['PROFESOR'] } };
  const resBlocked = {
    status: (code) => ({
      json: () => {
        blocked = code === 403;
      }
    })
  };

  requireAnyRole(['ADMIN', 'PSICOLOGO'])(reqBlocked, resBlocked, () => {});
  assert.equal(blocked, true);
});
