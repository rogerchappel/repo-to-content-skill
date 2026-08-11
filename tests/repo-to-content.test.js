import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeRepo, buildBrief, runCli, toMarkdown } from '../src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('repo-to-content', () => {
  it('extracts repository evidence', async () => {
    const analysis = await analyzeRepo(path.join(root, 'fixtures/sample-repo'));
    assert.equal(analysis.name, 'sample-tool');
    assert.equal(analysis.evidence.readme, true);
    assert.equal(analysis.readiness, 3);
    assert.deepEqual(analysis.evidence.scripts.sort(), ['check', 'smoke', 'test']);
  });

  it('builds proof-backed content briefs', async () => {
    const brief = buildBrief(await analyzeRepo(path.join(root, 'fixtures/sample-repo')));
    assert.ok(brief.proofPaths.includes('README.md'));
    assert.ok(brief.proofPaths.includes('package.json'));
    assert.equal(brief.warnings.length, 0);
  });

  it('renders markdown output', async () => {
    const brief = buildBrief(await analyzeRepo(path.join(root, 'fixtures/sample-repo')));
    const markdown = toMarkdown(brief);
    assert.match(markdown, /sample-tool launch brief/);
    assert.match(markdown, /npm run smoke/);
  });

  it('keeps launch briefs local-only', async () => {
    const brief = buildBrief(await analyzeRepo(path.join(root, 'fixtures/sample-repo')));
    assert.deepEqual(brief.sideEffects, ['local-filesystem-read']);
  });

  it('ignores README symlinks to files outside the repository', async (t) => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), 'repo-to-content-file-symlink-'));
    const repo = path.join(fixture, 'repo');
    t.after(() => rm(fixture, { recursive: true, force: true }));
    await mkdir(repo);
    await writeFile(path.join(fixture, 'private.md'), 'private launch plan marker\n');
    await symlink(path.join(fixture, 'private.md'), path.join(repo, 'README.md'));

    const analysis = await analyzeRepo(repo);

    assert.equal(analysis.evidence.readme, false);
    assert.equal(analysis.description, '');
    assert.ok(!analysis.files.includes('README.md'));
  });

  it('does not traverse directory symlinks outside the repository', async (t) => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), 'repo-to-content-dir-symlink-'));
    const repo = path.join(fixture, 'repo');
    const external = path.join(fixture, 'external');
    t.after(() => rm(fixture, { recursive: true, force: true }));
    await mkdir(repo);
    await mkdir(external);
    await writeFile(path.join(external, 'README.md'), 'private launch plan marker\n');
    await symlink(external, path.join(repo, 'linked-docs'));

    const analysis = await analyzeRepo(repo);

    assert.equal(analysis.evidence.readme, false);
    assert.equal(analysis.description, '');
    assert.deepEqual(analysis.files, []);
  });

  it('rejects unsupported CLI formats', async () => {
    await assert.rejects(
      () => runCli(['fixtures/sample-repo', '--format', 'html'], {
        cwd: root,
        stdout: { write() {} },
        stderr: { write() {} }
      }),
      /unsupported format "html"/
    );
  });

  for (const { name, argv, message } of [
    { name: 'a missing --format value', argv: ['fixtures/sample-repo', '--format'], message: /missing value for --format/ },
    { name: 'unknown options', argv: ['fixtures/sample-repo', '--bogus'], message: /unknown option "--bogus"/ },
    { name: 'unknown options before the repository', argv: ['--bogus', 'fixtures/sample-repo'], message: /unknown option "--bogus"/ },
    { name: 'extra positional arguments', argv: ['fixtures/sample-repo', 'extra'], message: /unexpected argument "extra"/ }
  ]) {
    it(`rejects ${name} through the library API`, async () => {
      await assert.rejects(
        () => runCli(argv, {
          cwd: root,
          stdout: { write() {} },
          stderr: { write() {} }
        }),
        message
      );
    });

    it(`rejects ${name} through the executable CLI`, () => {
      const result = runExecutable(argv);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
      assert.match(result.stderr, /Usage: repo-to-content/);
      assert.equal(result.stdout, '');
    });
  }

  for (const { name, argv, output } of [
    { name: 'the default JSON format', argv: ['fixtures/sample-repo'], output: /^\{/ },
    { name: 'an explicit JSON format', argv: ['fixtures/sample-repo', '--format', 'json'], output: /^\{/ },
    { name: 'Markdown format', argv: ['fixtures/sample-repo', '--format', 'markdown'], output: /^# sample-tool launch brief/ },
    { name: 'help', argv: ['--help'], output: /^Usage: repo-to-content/ }
  ]) {
    it(`supports ${name} through the executable CLI`, () => {
      const result = runExecutable(argv);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, output);
    });
  }
});

function runExecutable(argv) {
  return spawnSync(process.execPath, [path.join(root, 'bin/repo-to-content.js'), ...argv], {
    cwd: root,
    encoding: 'utf8'
  });
}
