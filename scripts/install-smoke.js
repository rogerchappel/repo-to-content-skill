import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });

  if (result.error) throw result.error;

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    process.exit(result.status ?? 1);
  }

  return result;
}

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const tmpDir = mkdtempSync(path.join(tmpdir(), 'repo-to-content-install-'));
const packResult = run('npm', ['pack', '--silent'], { cwd: repoRoot });
const tarballName = packResult.stdout.trim().split(/\r?\n/).at(-1);
const tarballPath = path.join(repoRoot, tarballName);

try {
  run('npm', ['init', '-y', '--silent'], { cwd: tmpDir });
  run('npm', ['install', '--silent', tarballPath], { cwd: tmpDir });

  const binPath = path.join(tmpDir, 'node_modules', '.bin', 'repo-to-content');
  const help = run(binPath, ['--help'], { cwd: tmpDir });

  if (!help.stdout.includes('Usage: repo-to-content')) {
    console.error('install smoke failed; installed CLI did not print usage');
    process.exit(1);
  }

  console.log('install smoke passed; installed tarball and ran repo-to-content --help');
} finally {
  rmSync(tarballPath, { force: true });
  rmSync(tmpDir, { recursive: true, force: true });
}
