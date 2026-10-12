require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const { Startup } = require('../src/models/Startup');
const ConnectionRequest = require('../src/models/ConnectionRequest');
const { getJwtSecret } = require('../src/middleware/auth');

function resolveTestDatabaseUri() {
  const testUri = process.env.TEST_MONGODB_URI;
  if (testUri) return testUri;

  const defaultUri = process.env.MONGODB_URI;
  if (!defaultUri) {
    throw new Error(
      'Database configuration missing. Set TEST_MONGODB_URI in backend/.env to run integration tests safely.'
    );
  }

  // Refuse if defaultUri does not clearly target a test database
  const isTestDb = /test/i.test(defaultUri);
  if (!isTestDb) {
    throw new Error(
      'Refusing to run tests against primary development database. Configure TEST_MONGODB_URI with a dedicated test database (e.g. mongodb://127.0.0.1:27017/startupmeu_connect_test).'
    );
  }

  return defaultUri;
}

async function run() {
  getJwtSecret();
  const dbUri = resolveTestDatabaseUri();
  console.log(`Connecting to isolated test database: ${dbUri.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(dbUri);

  let server;
  let testUserAId;
  let testUserBId;
  let testStartupId;

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
      const body = await response.json().catch(() => ({}));
      return { status: response.status, body };
    }

    function expectStatus(result, expected, label) {
      assert.equal(
        result.status,
        expected,
        `${label} failed. Expected ${expected}, got ${result.status}: ${JSON.stringify(result.body)}`
      );
    }

    // 1. Health check
    const health = await call('/api/health');
    expectStatus(health, 200, 'Health check');
    assert.equal(health.body.status, 'ok');
    assert.equal(health.body.database, 'connected');

    // 2. Authentication Scenarios
    const timestamp = Date.now();
    const userAEmail = `founder_a_${timestamp}@test.invalid`;
    const userBEmail = `founder_b_${timestamp}@test.invalid`;
    const userPassword = 'CorrectPassword123!';

    // 2a. Successful registration
    const regA = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Founder Alice',
        email: userAEmail,
        password: userPassword,
        role: 'founder',
      }),
    });
    expectStatus(regA, 201, 'User A registration');
    assert.ok(regA.body.data?.token, 'Registration should return token');
    testUserAId = regA.body.data?.user?.id;
    const tokenA = regA.body.data?.token;

    const regB = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Founder Bob',
        email: userBEmail,
        password: userPassword,
        role: 'founder',
      }),
    });
    expectStatus(regB, 201, 'User B registration');
    testUserBId = regB.body.data?.user?.id;
    const tokenB = regB.body.data?.token;

    // 2b. Duplicate email rejection
    const dupReg = await call('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate Alice',
        email: userAEmail,
        password: userPassword,
      }),
    });
    expectStatus(dupReg, 409, 'Duplicate registration rejection');

    // 2c. Invalid password login
    const badLogin = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userAEmail, password: 'WrongPassword999' }),
    });
    expectStatus(badLogin, 401, 'Invalid password rejection');

    // 2d. Successful login
    const goodLogin = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userAEmail, password: userPassword }),
    });
    expectStatus(goodLogin, 200, 'Valid login');
    assert.ok(goodLogin.body.data?.token, 'Login should return token');

    // 2e. Protected profile check
    const meAuthed = await call('/api/auth/me', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expectStatus(meAuthed, 200, 'Authenticated profile lookup');
    assert.equal(meAuthed.body.data?.user?.email, userAEmail);

    const meUnauthed = await call('/api/auth/me');
    expectStatus(meUnauthed, 401, 'Unauthenticated profile rejection');

    const meBadToken = await call('/api/auth/me', {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    expectStatus(meBadToken, 401, 'Malformed token rejection');

    // 3. Authenticated Startup Creation & Owner Assignment
    const profile = {
      name: `Startup Test ${timestamp}`,
      tagline: 'A revolutionary test startup',
      description: 'Detailed description exceeding twenty characters for validation requirements.',
      industry: 'AI & Testing',
      stage: 'Seed',
      location: 'Bengaluru, India',
      fundingRequired: 150000,
    };

    // Unauthenticated creation rejected
    const unauthedCreate = await call('/api/startups', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
    expectStatus(unauthedCreate, 401, 'Unauthenticated startup creation rejection');

    // Authenticated creation with client spoofing owner
    const createWithSpoof = await call('/api/startups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ ...profile, owner: '65f000000000000000000000' }),
    });
    expectStatus(createWithSpoof, 201, 'Authenticated startup creation');
    testStartupId = createWithSpoof.body.data?._id;
    assert.ok(testStartupId);
    assert.equal(
      createWithSpoof.body.data.owner,
      testUserAId,
      'Startup owner must be set from authenticated user, ignoring client spoofing'
    );

    // 4. Public Listing and Filter Verification
    const publicList = await call('/api/startups');
    expectStatus(publicList, 200, 'Public startup listing');
    assert.ok(Array.isArray(publicList.body.data));

    // Min & Max funding filters
    const filterSuccess = await call(
      `/api/startups?industry=${encodeURIComponent(profile.industry)}&minFunding=100000&maxFunding=200000`
    );
    expectStatus(filterSuccess, 200, 'Min & Max funding filtering');
    assert.ok(filterSuccess.body.data.some((s) => s._id === testStartupId));

    const filterMismatch = await call(
      `/api/startups?industry=${encodeURIComponent(profile.industry)}&minFunding=200000&maxFunding=300000`
    );
    expectStatus(filterMismatch, 200, 'Out of bounds funding filtering');
    assert.ok(!filterMismatch.body.data.some((s) => s._id === testStartupId));

    // Min > Max funding rejection
    const filterInvalid = await call('/api/startups?minFunding=500000&maxFunding=100000');
    expectStatus(filterInvalid, 400, 'Min > Max funding rejection');

    // 5. Authorization: Update & Delete Protection
    // User B attempts to edit User A's startup
    const unauthorizedUpdate = await call(`/api/startups/${testStartupId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ location: 'Unauthorized Location' }),
    });
    expectStatus(unauthorizedUpdate, 403, 'Unauthorized update rejection (User B editing User A)');

    // Owner (User A) updates their startup
    const authorizedUpdate = await call(`/api/startups/${testStartupId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ location: 'Authorized New Location' }),
    });
    expectStatus(authorizedUpdate, 200, 'Owner startup update');
    assert.equal(authorizedUpdate.body.data.location, 'Authorized New Location');

    // 6. Connection Request & Access Control
    const connectionRes = await call(`/api/startups/${testStartupId}/connection-requests`, {
      method: 'POST',
      body: JSON.stringify({
        investorName: 'Angel Investor',
        investorEmail: 'angel@investor.invalid',
        message: 'Interested in leading your seed round. Let us connect.',
      }),
    });
    expectStatus(connectionRes, 201, 'Investor connection request submission');

    // Non-owner (User B) attempts to read connection requests
    const readRequestsB = await call(`/api/startups/${testStartupId}/connection-requests`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expectStatus(readRequestsB, 403, 'Non-owner connection request inspection rejection');

    // Owner (User A) reads connection requests
    const readRequestsA = await call(`/api/startups/${testStartupId}/connection-requests`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expectStatus(readRequestsA, 200, 'Owner connection request inspection');
    assert.equal(readRequestsA.body.data.length, 1);

    // 7. Authorization: Deletion Protection & Cascade
    // User B attempts to delete User A's startup
    const unauthorizedDelete = await call(`/api/startups/${testStartupId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expectStatus(unauthorizedDelete, 403, 'Unauthorized deletion rejection (User B deleting User A)');

    // Owner (User A) deletes startup
    const authorizedDelete = await call(`/api/startups/${testStartupId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expectStatus(authorizedDelete, 200, 'Owner startup deletion');
    testStartupId = null;

    // Verify connection requests were cleaned up
    const remainingRequests = await ConnectionRequest.countDocuments({ startup: authorizedDelete.body.data._id });
    assert.equal(remainingRequests, 0, 'Connection requests should cascade delete with startup');

    console.log('✓ All integration tests PASSED:');
    console.log('  - Health check');
    console.log('  - Registration, duplicate prevention, password validation');
    console.log('  - JWT authentication and session validation');
    console.log('  - Ownership assignment & client spoofing protection');
    console.log('  - Min & max funding filters and combination search');
    console.log('  - Owner authorization on update & delete (403 forbidden for non-owners)');
    console.log('  - Connection request submission and owner-only request viewing');
    console.log('  - Cascading deletion and cleanup');
  } finally {
    // Targeted cleanup of records created strictly by this test run
    if (testStartupId) {
      await ConnectionRequest.deleteMany({ startup: testStartupId });
      await Startup.deleteOne({ _id: testStartupId });
    }
    if (testUserAId) {
      await User.deleteOne({ _id: testUserAId });
    }
    if (testUserBId) {
      await User.deleteOne({ _id: testUserBId });
    }

    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(`API smoke check failed: ${error.message}`);
  process.exitCode = 1;
});
