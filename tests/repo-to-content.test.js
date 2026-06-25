import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
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
});
