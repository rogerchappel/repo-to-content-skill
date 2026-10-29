import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const releaseCheck = manifest.scripts['release:check'];
const ciWorkflow = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');

test('release check includes packed artifact and install smoke gates', () => {
  assert.match(releaseCheck, /npm run package:contract(?:\s|&&|$)/);
  assert.match(releaseCheck, /npm run install:smoke(?:\s|&&|$)/);
});

test('CI runs release:check so its package contract cannot be omitted', () => {
  assert.match(ciWorkflow, /^\s+- run:\s*npm run release:check\s*$/m);
});

test('CI contract validator rejects a workflow that omits release:check', () => {
  const omittedCheck = ciWorkflow.replace(/^\s+- run:\s*npm run release:check\s*\n/m, '');
  assert.doesNotMatch(omittedCheck, /^\s+- run:\s*npm run release:check\s*$/m);
  assert.notEqual(omittedCheck, ciWorkflow);
});
