import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const releaseCheck = manifest.scripts['release:check'];

test('release check includes packed artifact and install smoke gates', () => {
  assert.match(releaseCheck, /npm run package:contract(?:\s|&&|$)/);
  assert.match(releaseCheck, /npm run install:smoke(?:\s|&&|$)/);
});
