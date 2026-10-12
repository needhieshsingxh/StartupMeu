require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../src/app');
const { Startup } = require('../src/models/Startup');
const ConnectionRequest = require('../src/models/ConnectionRequest');

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Configure backend/.env before running the API smoke test.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  let server;
  let startupId;
  try {
    server = await new Promise((resolve, reject) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
      instance.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    async function call(path, options = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      const body = await response.json();
      return { status: response.status, body };
    }
    function expectStatus(result, expected, label) {
      assert.equal(result.status, expected, `${label}: ${JSON.stringify(result.body)}`);
    }

    const health = await call('/api/health');
    expectStatus(health, 200, 'health');
    assert.equal(health.body.status, 'ok');
    assert.equal(health.body.database, 'connected');

    const unique = `API smoke ${Date.now()}`;
    const profile = {
      name: unique,
      tagline: 'Temporary record for the automated API check',
      description: 'This temporary startup profile verifies API persistence and is deleted after the check.',
      industry: 'API smoke test',
      stage: 'Seed',
      location: 'Local test environment',
      fundingRequired: 250000,
    };

    const invalid = await call('/api/startups', { method: 'POST', body: JSON.stringify({ ...profile, stage: 'Unknown' }) });
    expectStatus(invalid, 400, 'invalid profile validation');

    const created = await call('/api/startups', { method: 'POST', body: JSON.stringify(profile) });
    expectStatus(created, 201, 'create startup');
    startupId = created.body.data._id;
    assert.ok(startupId);

    const filtered = await call(`/api/startups?industry=${encodeURIComponent(profile.industry)}&stage=Seed&minFunding=200000&maxFunding=300000&search=${encodeURIComponent(unique)}`);
    expectStatus(filtered, 200, 'filtered startup list');
    assert.ok(filtered.body.data.some((item) => item._id === startupId));

    const detail = await call(`/api/startups/${startupId}`);
    expectStatus(detail, 200, 'startup detail');
    assert.equal(detail.body.data.name, unique);

    const updated = await call(`/api/startups/${startupId}`, {
      method: 'PATCH',
      body: JSON.stringify({ location: 'Updated test location' }),
    });
    expectStatus(updated, 200, 'update startup');
    assert.equal(updated.body.data.location, 'Updated test location');

    const request = await call(`/api/startups/${startupId}/connection-requests`, {
      method: 'POST',
      body: JSON.stringify({
        investorName: 'API Smoke Tester',
        investorEmail: 'smoke@example.invalid',
        message: 'This temporary request verifies that a connection request persists in MongoDB.',
      }),
    });
    expectStatus(request, 201, 'create connection request');
    assert.equal(await ConnectionRequest.countDocuments({ startup: startupId }), 1);

    const removed = await call(`/api/startups/${startupId}`, { method: 'DELETE' });
    expectStatus(removed, 200, 'delete startup');
    startupId = null;
    assert.equal(await ConnectionRequest.countDocuments({ startup: removed.body.data._id }), 0);
    const missing = await call(`/api/startups/${removed.body.data._id}`);
    expectStatus(missing, 404, 'deleted startup lookup');

    console.log('API smoke check passed: health, validation, create, filtered list, detail, update, connection request persistence, delete, and cleanup.');
  } finally {
    if (startupId) {
      await ConnectionRequest.deleteMany({ startup: startupId });
      await Startup.deleteOne({ _id: startupId });
    }
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(`API smoke check failed: ${error.message}`);
  process.exitCode = 1;
});
