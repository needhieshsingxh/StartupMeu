const assert = require('node:assert/strict');
const User = require('../src/models/User');

async function testUserModelPreSaveHook() {
  const plaintext = 'SecurePass123!@#';
  const user = new User({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: plaintext,
    role: 'founder',
  });

  // 1. Prior to pre-save, password is plaintext
  assert.equal(user.password, plaintext, 'Password should initially be plaintext');

  // 2. Execute actual registered Mongoose pre-save middleware pipeline
  await new Promise((resolve, reject) => {
    User.schema.s.hooks.execPre('save', user, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  // 3. Verify actual hook transformed password to bcrypt hash
  assert.notEqual(user.password, plaintext, 'Stored password must differ from plaintext');
  assert.ok(
    user.password.startsWith('$2a$') || user.password.startsWith('$2b$'),
    'Stored password must be a valid bcrypt hash'
  );
  assert.equal(user.password.length, 60, 'Bcrypt hash must be exactly 60 characters long');

  // 4. Verify comparePassword accepts correct password
  const matchesCorrect = await user.comparePassword(plaintext);
  assert.equal(matchesCorrect, true, 'comparePassword must return true for correct plaintext');

  // 5. Verify comparePassword rejects incorrect password
  const matchesWrong = await user.comparePassword('IncorrectPass999!');
  assert.equal(matchesWrong, false, 'comparePassword must return false for incorrect password');

  // 6. Verify idempotency: subsequent saves without password modification do not double-hash
  const initialHash = user.password;
  user.$__.activePaths.clear('modify', 'password');
  user.$__reset();
  user.name = 'Ada King-Noel';

  await new Promise((resolve, reject) => {
    User.schema.s.hooks.execPre('save', user, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  assert.equal(user.password, initialHash, 'Pre-save hook must not re-hash unmodified password');

  console.log('✓ All User model pre-save hook unit tests PASSED:');
  console.log('  - Mongoose registered pre("save") hook executed successfully');
  console.log('  - Plaintext converted to 60-char bcrypt hash ($2b$/$2a$)');
  console.log('  - comparePassword() accepts correct password');
  console.log('  - comparePassword() rejects incorrect password');
  console.log('  - Unmodified password preserved without double-hashing');
}

testUserModelPreSaveHook().catch((err) => {
  console.error('User model pre-save test failed:', err);
  process.exit(1);
});

