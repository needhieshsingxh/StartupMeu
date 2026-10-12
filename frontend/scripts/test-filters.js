import assert from 'node:assert/strict';

function buildFilterQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, value);
    }
  }
  return params.toString();
}

function validateFundingFilters(minFunding, maxFunding) {
  const min = minFunding !== '' && minFunding !== undefined && minFunding !== null ? Number(minFunding) : undefined;
  const max = maxFunding !== '' && maxFunding !== undefined && maxFunding !== null ? Number(maxFunding) : undefined;

  if (min !== undefined && (!Number.isFinite(min) || min < 0)) {
    return 'Minimum ask must be a non-negative number.';
  }
  if (max !== undefined && (!Number.isFinite(max) || max < 0)) {
    return 'Maximum ask must be a non-negative number.';
  }
  if (min !== undefined && max !== undefined && min > max) {
    return 'Minimum ask cannot exceed maximum ask.';
  }
  return null;
}

// 1. Test empty filters produces empty query string
assert.equal(buildFilterQuery({}), '');
assert.equal(buildFilterQuery({ search: '', minFunding: '', maxFunding: '' }), '');

// 2. Test minFunding and maxFunding inclusion
const q1 = buildFilterQuery({ minFunding: '50000', maxFunding: '250000' });
assert.equal(q1, 'minFunding=50000&maxFunding=250000');

// 3. Test combination filters (search, industry, stage, location, minFunding, maxFunding)
const q2 = buildFilterQuery({
  search: 'Nexus',
  industry: 'Fintech',
  stage: 'Seed',
  location: 'London',
  minFunding: '100000',
  maxFunding: '500000',
});
assert.ok(q2.includes('search=Nexus'));
assert.ok(q2.includes('industry=Fintech'));
assert.ok(q2.includes('stage=Seed'));
assert.ok(q2.includes('location=London'));
assert.ok(q2.includes('minFunding=100000'));
assert.ok(q2.includes('maxFunding=500000'));

// 4. Test validation rules
assert.equal(validateFundingFilters('1000', '5000'), null);
assert.equal(validateFundingFilters('5000', '1000'), 'Minimum ask cannot exceed maximum ask.');
assert.equal(validateFundingFilters('-100', '5000'), 'Minimum ask must be a non-negative number.');
assert.equal(validateFundingFilters('1000', '-500'), 'Maximum ask must be a non-negative number.');
assert.equal(validateFundingFilters('not-a-number', '5000'), 'Minimum ask must be a non-negative number.');
assert.equal(validateFundingFilters('', '5000'), null);
assert.equal(validateFundingFilters('5000', ''), null);

console.log('✓ All frontend filter unit tests PASSED:');
console.log('  - Empty parameter exclusion');
console.log('  - Min & max funding query serialization');
console.log('  - Multi-attribute filter combination');
console.log('  - Min <= Max range validation');
console.log('  - Non-negative number validation');
