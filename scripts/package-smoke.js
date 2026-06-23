import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'bin/repo-to-content.js',
  'src/index.js',
  'fixtures/sample-repo/README.md',
  'fixtures/sample-repo/package.json',
  'docs/OUTPUT_SCHEMA.md',
  'SKILL.md',
  'README.md',
  'LICENSE',
];

const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const [packument] = JSON.parse(result.stdout);
const packedFiles = new Set(packument.files.map((file) => file.path));
const missing = requiredFiles.filter((file) => !packedFiles.has(file));

if (missing.length > 0) {
  console.error(`package smoke failed; missing files: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`package smoke passed; checked ${requiredFiles.length} required files`);
