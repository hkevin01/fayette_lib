const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

test('admin API high-risk workflows', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fcpl-admin-test-'));

  writeJson(path.join(tmp, 'events.json'), { events: [] });
  writeJson(path.join(tmp, 'content.json'), { site: { name: 'Test Site' } });
  writeJson(path.join(tmp, 'recycle_bin.json'), { items: [] });
  writeJson(path.join(tmp, 'analytics.json'), { pageviews: [], events: [], last_updated: new Date().toISOString() });

  process.env.NODE_ENV = 'test';
  process.env.DATA_DIR = tmp;
  process.env.IMAGES_DIR = path.join(tmp, 'images');
  process.env.GENERAL_IMAGES_DIR = path.join(tmp, 'general-images');
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
  process.env.STAFF_PASSWORD = 'test-password';

  const { app } = require('../server');
  const api = request(app);

  const loginRes = await api
    .post('/admin/api/auth/login')
    .send({ password: 'test-password' })
    .expect(200);

  assert.ok(loginRes.body.token, 'Expected JWT token');
  const auth = { Authorization: 'Bearer ' + loginRes.body.token };

  const createRes = await api
    .post('/admin/api/events')
    .set(auth)
    .send({
      title: 'Integration Test Event',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      location: 'Test Branch',
      category: 'general',
      description: 'Integration test event',
      recurrence: 'none',
      recurrence_day: '',
    })
    .expect(200);

  assert.equal(createRes.body.title, 'Integration Test Event');
  assert.ok(createRes.body.id);

  const eventsRes = await api.get('/admin/api/events').set(auth).expect(200);
  assert.ok(Array.isArray(eventsRes.body.events));
  assert.equal(eventsRes.body.events.length, 1);

  await api.delete('/admin/api/events/' + createRes.body.id).set(auth).expect(200);

  const binRes = await api.get('/admin/api/recycle-bin').set(auth).expect(200);
  assert.ok(Array.isArray(binRes.body.items));
  assert.ok(binRes.body.items.length >= 1);

  const hostingRes = await api
    .put('/admin/api/content/hosting')
    .set(auth)
    .send({ dns_provider: 'Cloudflare', hosting_service: 'Docker', server_ip: '127.0.0.1' })
    .expect(200);

  assert.equal(hostingRes.body.section, 'hosting');
  assert.equal(hostingRes.body.data.dns_provider, 'Cloudflare');

  await api.get('/admin/api/hosting/discover?host=not a valid host').set(auth).expect(500);
});
