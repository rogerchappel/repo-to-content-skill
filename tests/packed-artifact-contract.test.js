import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePackedContract } from '../scripts/packed-artifact-contract.js';

test('packed artifact requires executable and runtime module', () => {
  assert.doesNotThrow(() => validatePackedContract(new Set([
    'bin/repo-to-content.js', 'src/index.js', 'README.md', 'package.json',
  ])));
});

test('packed artifact fails clearly when executable is missing', () => {
  assert.throws(
    () => validatePackedContract(new Set(['src/index.js', 'package.json'])),
    { message: 'packed artifact is missing bin/repo-to-content.js' },
  );
});

test('packed artifact fails clearly when runtime module is missing', () => {
  assert.throws(
    () => validatePackedContract(new Set(['bin/repo-to-content.js', 'package.json'])),
    { message: 'packed artifact is missing src/index.js' },
  );
});
