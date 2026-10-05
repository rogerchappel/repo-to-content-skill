import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    process.exit(result.status ?? 1);
  }
  return result;
}

const root = path.resolve(new URL('..', import.meta.url).pathname);
const temp = mkdtempSync(path.join(tmpdir(), 'repo-to-content-packed-'));
let tarballPath;
try {
  const pack = run('npm', ['pack', '--silent'], { cwd: root });
  const tarball = pack.stdout.trim().split(/\r?\n/).at(-1);
  tarballPath = path.join(root, tarball);
  const listing = run('tar', ['-tzf', tarballPath]);
  const files = new Set(listing.stdout.trim().split(/\r?\n/).map((file) => file.replace(/^package\//, '')));
  for (const required of ['bin/repo-to-content.js', 'src/index.js']) {
    if (!files.has(required)) throw new Error(`packed artifact is missing ${required}`);
  }

  run('npm', ['init', '-y', '--silent'], { cwd: temp });
  run('npm', ['install', '--silent', tarballPath], { cwd: temp });
  const bin = path.join(temp, 'node_modules/.bin/repo-to-content');
  const help = run(bin, ['--help'], { cwd: temp });
  if (!help.stdout.includes('Usage: repo-to-content')) throw new Error('installed CLI did not print usage');
  const fixture = path.join(root, 'fixtures/sample-repo');
  const output = run(bin, [fixture, '--format', 'json'], { cwd: temp });
  const brief = JSON.parse(output.stdout);
  if (brief.title !== 'sample-tool launch brief' || !Array.isArray(brief.proofPaths)) {
    throw new Error('installed CLI output did not match the fixture contract');
  }
  console.log('packed artifact contract passed; tarball includes executable/runtime module and installed CLI runs in clean consumer');
} finally {
  if (tarballPath) rmSync(tarballPath, { force: true });
  rmSync(temp, { recursive: true, force: true });
}
