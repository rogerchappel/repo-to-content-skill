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
    assert.equal(brief.posts.short, 'sample-tool is ready to try locally: A sample local CLI with evidence-backed docs. Evidence: README.md, docs/usage.md, tests/sample.test.js.');
  });

  it('cites a nested README by its scanned path without claiming a root README', async (t) => {
    const repo = await makeRepo(t);
    await mkdir(path.join(repo, 'docs'));
    await writeFile(path.join(repo, 'docs/README.md'), '# Docs\n\nDocumentation-only summary.\n');

    const analysis = await analyzeRepo(repo);
    const brief = buildBrief(analysis);

    assert.equal(analysis.evidence.readme, true);
    assert.equal(analysis.evidence.readmePath, 'docs/README.md');
    assert.deepEqual(brief.proofPaths, ['docs/README.md']);
    assert.ok(brief.proofPaths.every((file) => analysis.files.includes(file)));
  });

  it('warns when package.json is invalid instead of treating metadata as absent', async (t) => {
    const repo = await makeRepo(t);
    await writeFile(path.join(repo, 'package.json'), '{ invalid json');

    const analysis = await analyzeRepo(repo);

    assert.equal(analysis.name, path.basename(repo));
    assert.match(analysis.warnings[0], /^Invalid package\.json; package metadata was ignored:/);
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

  it('excludes dependency, generated, and VCS directories from repository evidence', async (t) => {
    const repo = await makeRepo(t);
    await writeFile(path.join(repo, 'package.json'), JSON.stringify({
      name: 'scan-boundary',
      scripts: { smoke: 'node smoke.js' }
    }));
    await mkdir(path.join(repo, 'src'));
    await writeFile(path.join(repo, 'src/index.js'), 'export const genuine = true;\n');

    for (const directory of ['.git', '.hg', '.svn', 'build', 'coverage', 'dist', 'node_modules', 'vendor']) {
      await mkdir(path.join(repo, directory, 'docs'), { recursive: true });
      await mkdir(path.join(repo, directory, 'tests'), { recursive: true });
      await writeFile(path.join(repo, directory, 'README.md'), '# Excluded README\n\nDependency-only description.\n');
      await writeFile(path.join(repo, directory, 'docs/usage.md'), 'Excluded documentation.\n');
      await writeFile(path.join(repo, directory, 'tests/dependency.test.js'), 'throw new Error("not repository evidence");\n');
    }

    const analysis = await analyzeRepo(repo);
    const brief = buildBrief(analysis);

    assert.deepEqual(analysis.files, ['package.json', 'src/index.js']);
    assert.deepEqual(analysis.evidence.docs, []);
    assert.deepEqual(analysis.evidence.tests, []);
    assert.equal(analysis.evidence.readme, false);
    assert.equal(analysis.description, '');
    assert.equal(analysis.readiness, 1);
    assert.ok(!analysis.claims.some((claim) => /README|documentation|test-related/.test(claim)));
    assert.deepEqual(brief.proofPaths, ['package.json']);
    assert.ok(brief.warnings.includes('README evidence missing; avoid usage claims until documented.'));
    assert.ok(brief.warnings.includes('No test evidence found; avoid reliability claims.'));
  });

  for (const format of ['json', 'markdown']) {
    it(`keeps excluded evidence out of executable ${format} output`, async (t) => {
      const repo = await makeRepo(t);
      await mkdir(path.join(repo, 'node_modules/dependency/tests'), { recursive: true });
      await writeFile(path.join(repo, 'node_modules/dependency/README.md'), '# Dependency docs\n');
      await writeFile(path.join(repo, 'node_modules/dependency/tests/dep.test.js'), 'dependency test\n');
      await mkdir(path.join(repo, 'docs'));
      await writeFile(path.join(repo, 'docs/usage.md'), 'Genuine repository documentation.\n');

      const result = runExecutable([repo, '--format', format]);
      const output = format === 'json' ? JSON.parse(result.stdout) : result.stdout;

      assert.equal(result.status, 0, result.stderr);
      assert.doesNotMatch(result.stdout, /node_modules|Dependency docs|dep\.test/);
      if (format === 'json') {
        assert.deepEqual(output.proofPaths, ['docs/usage.md']);
        assert.equal(output.readiness, 0);
      } else {
        assert.match(output, /- docs\/usage\.md/);
        assert.match(output, /Readiness: 0\/3/);
      }
    });
  }

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

  it('reports invalid package metadata through executable JSON output and stderr', async (t) => {
    const repo = await makeRepo(t);
    await writeFile(path.join(repo, 'package.json'), '{ invalid json');

    const result = runExecutable([repo]);
    const brief = JSON.parse(result.stdout);

    assert.equal(result.status, 0, result.stderr);
    assert.match(brief.warnings[0], /^Invalid package\.json; package metadata was ignored:/);
    assert.match(result.stderr, /^4 warning\(s\) need review/);
  });
});

async function makeRepo(t) {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'repo-to-content-fixture-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  return repo;
}

function runExecutable(argv) {
  return spawnSync(process.execPath, [path.join(root, 'bin/repo-to-content.js'), ...argv], {
    cwd: root,
    encoding: 'utf8'
  });
}
