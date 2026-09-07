import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const workflow = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');

const minimumMatch = manifest.engines?.node?.match(/^>=(\d+)$/);
assert.ok(minimumMatch, 'package.json engines.node must be a simple >= major constraint');

const matrixNodes = [...workflow.matchAll(/^\s+- node-version:\s*(\d+)\s*$/gm)].map((match) => Number(match[1]));
assert.deepEqual(matrixNodes, [Number(minimumMatch[1]), 24], 'CI must test the declared minimum and current Node endpoint');

assert.match(workflow, /actions\/checkout@v5/, 'CI must use actions/checkout@v5');
assert.match(workflow, /actions\/setup-node@v5/, 'CI must use actions/setup-node@v5');
assert.match(workflow, /^\s+cache:\s*npm\s*$/m, 'CI must enable the setup-node npm cache');
assert.equal((workflow.match(/^\s+npm-version:\s*\d+\s*$/gm) ?? []).length, matrixNodes.length, 'each Node endpoint must declare an npm version');

console.log(`CI contract verified for Node ${matrixNodes.join(' and ')}`);
