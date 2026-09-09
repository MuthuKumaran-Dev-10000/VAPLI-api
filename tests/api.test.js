const assert = require('assert');
const test = require('node:test');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

let superAdminToken = '';
let adminToken = '';
let createdClientId = '';
let createdUserId = '';

test.before(async () => {
  await db.initPool();
});

test('1. Health Check Endpoint', async () => {
  const res = await request(app).get('/health');

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.system, 'vapli-api');
});

test('2. Auth Login - Super Admin Success', async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({
      username: 'admin',
      password: 'Admin@123'
    });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.user.role, 'super admin');
  assert.strictEqual(res.body.data.user.roleRank, 1);
  assert.ok(res.body.data.token);

  superAdminToken = res.body.data.token;
});

test('3. Auth Login - Invalid Password Handling', async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({
      username: 'admin',
      password: 'WrongPassword'
    });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});

test('4. Clients CRUD - Super Admin Create Client', async () => {
  const clientName = `Test Client ${Date.now()}`;
  const res = await request(app)
    .post('/api/v1/clients')
    .set('Authorization', `Bearer ${superAdminToken}`)
    .send({
      name: clientName,
      description: 'Unit test organization scope'
    });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.client.name, clientName);
  assert.ok(res.body.data.client.id);

  createdClientId = res.body.data.client.id;
});

test('5. Clients List - Admin Access', async () => {
  const res = await request(app)
    .get('/api/v1/clients')
    .set('Authorization', `Bearer ${superAdminToken}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.clients));
});

test('6. Users CRUD - Super Admin Create User', async () => {
  const username = `testuser_${Date.now()}`;
  const res = await request(app)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${superAdminToken}`)
    .send({
      username,
      fullName: 'Test Operational User',
      password: 'Password123!',
      role: 'user',
      clientIds: [createdClientId]
    });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.user.username, username);
  assert.strictEqual(res.body.data.user.role, 'user');
  assert.ok(res.body.data.user.id);

  createdUserId = res.body.data.user.id;
});

test('7. Users List Grouped by Client for Super Admin', async () => {
  const res = await request(app)
    .get('/api/v1/users')
    .set('Authorization', `Bearer ${superAdminToken}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.groupedByClient));
});

test('8. RBAC Security - Unauthenticated Request Rejected', async () => {
  const res = await request(app)
    .post('/api/v1/users')
    .send({
      username: 'unauth_user',
      password: 'Password123!',
      role: 'super admin'
    });

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
});

test('9. Audit Log Verification', async () => {
  const res = await request(app)
    .get('/api/v1/audit-logs')
    .set('Authorization', `Bearer ${superAdminToken}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.data.logs.length > 0);
});
