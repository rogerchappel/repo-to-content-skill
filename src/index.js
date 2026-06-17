import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export async function analyzeRepo(repoDir) {
  const root = path.resolve(repoDir);
  const files = await listFiles(root);
  const packageJson = await readJsonIfPresent(path.join(root, 'package.json'));
  const readme = await readFirst(files, root, /^readme\.md$/i);
  const docs = files.filter((file) => file.startsWith('docs/'));
  const tests = files.filter((file) => /(^|\/)(test|tests|__tests__)\//.test(file) || /\.(test|spec)\./.test(file));
  const scripts = packageJson?.scripts ?? {};

  return {
    repoDir: root,
    name: packageJson?.name ?? path.basename(root),
    description: packageJson?.description ?? firstParagraph(readme) ?? '',
    files,
    evidence: {
      readme: Boolean(readme),
      docs,
      tests,
      scripts: Object.keys(scripts)
    },
    claims: buildClaims({ packageJson, readme, docs, tests, scripts }),
    demoCommands: buildDemoCommands(scripts),
    warnings: buildWarnings({ readme, tests, scripts }),
    readiness: scoreReadiness({ readme, tests, scripts })
  };
}

export function scoreReadiness({ readme, tests, scripts }) {
  return [Boolean(readme), tests.length > 0, Boolean(scripts.smoke)].filter(Boolean).length;
}

export function buildBrief(analysis) {
  return {
    title: `${analysis.name} launch brief`,
    generatedAt: new Date(0).toISOString(),
    summary: analysis.description || 'No package description found.',
    proofPaths: proofPaths(analysis),
    claims: analysis.claims,
    demoCommands: analysis.demoCommands,
    posts: {
      short: draftShortPost(analysis),
      technical: draftTechnicalPost(analysis)
    },
    warnings: analysis.warnings,
    readiness: analysis.readiness,
    sideEffects: ['local-filesystem-read']
  };
}

export function toMarkdown(brief) {
  const lines = [
    `# ${brief.title}`,
    '',
    `Generated: ${brief.generatedAt}`,
    '',
    brief.summary,
    '',
    `Readiness: ${brief.readiness}/3`,
    '',
    '## Evidence',
    ...brief.proofPaths.map((item) => `- ${item}`),
    '',
    '## Claims',
    ...brief.claims.map((item) => `- ${item}`),
    '',
    '## Demo Commands',
    ...brief.demoCommands.map((item) => `- \`${item}\``),
    '',
    '## Draft Posts',
    '',
    brief.posts.short,
    '',
    brief.posts.technical,
    '',
    '## Warnings',
    ...(brief.warnings.length ? brief.warnings.map((item) => `- ${item}`) : ['- None'])
  ];
  return `${lines.join('\n')}\n`;
}

export async function runCli(argv, io) {
  const args = parseArgs(argv);
  if (args.help || !args.repoDir) {
    io.stdout.write('Usage: repo-to-content <repo-dir> [--format json|markdown]\n');
    return;
  }
  const analysis = await analyzeRepo(path.resolve(io.cwd, args.repoDir));
  const brief = buildBrief(analysis);
  io.stdout.write(args.format === 'json' ? `${JSON.stringify(brief, null, 2)}\n` : toMarkdown(brief));
  if (brief.warnings.length > 0) {
    io.stderr.write(`${brief.warnings.length} warning(s) need review\n`);
  }
}

function buildClaims({ packageJson, readme, docs, tests, scripts }) {
  const claims = [];
  if (packageJson?.description) claims.push(`Describes itself as: ${packageJson.description}`);
  if (readme) claims.push('Includes README-backed usage context.');
  if (docs.length > 0) claims.push(`Includes ${docs.length} documentation file(s).`);
  if (tests.length > 0) claims.push(`Includes ${tests.length} test-related file(s).`);
  if (scripts.smoke) claims.push('Provides a smoke command for local verification.');
  return claims;
}

function buildDemoCommands(scripts) {
  const preferred = ['smoke', 'test', 'check', 'build'].filter((script) => scripts[script]);
  return preferred.length ? preferred.map((script) => `npm run ${script}`) : ['Review README for manual demo steps'];
}

function buildWarnings({ readme, tests, scripts }) {
  const warnings = [];
  if (!readme) warnings.push('README evidence missing; avoid usage claims until documented.');
  if (tests.length === 0) warnings.push('No test evidence found; avoid reliability claims.');
  if (!scripts.smoke) warnings.push('No smoke script found; demo command may need manual confirmation.');
  if (scripts.publish) warnings.push('Publish script found; do not run external release actions from this workflow.');
  return warnings;
}

function proofPaths(analysis) {
  const paths = [];
  if (analysis.evidence.readme) paths.push('README.md');
  paths.push(...analysis.evidence.docs);
  paths.push(...analysis.evidence.tests);
  if (analysis.evidence.scripts.length > 0) paths.push('package.json');
  return [...new Set(paths)];
}

function draftShortPost(analysis) {
  return `${analysis.name} is ready to try locally: ${analysis.description || 'it now has repo-grounded launch notes'}. Evidence: ${proofPaths(analysis).slice(0, 3).join(', ')}.`;
}

function draftTechnicalPost(analysis) {
  return `Built a repo-grounded launch brief for ${analysis.name}. The current evidence supports ${analysis.claims.length} claim(s), with demo flow: ${analysis.demoCommands.join(' && ')}.`;
}

async function listFiles(root, prefix = '') {
  const dir = path.join(root, prefix);
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const relative = path.join(prefix, entry);
    const info = await stat(path.join(root, relative));
    if (info.isDirectory()) files.push(...await listFiles(root, relative));
    else files.push(relative.replaceAll(path.sep, '/'));
  }
  return files.sort();
}

async function readJsonIfPresent(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function readFirst(files, root, pattern) {
  const match = files.find((file) => pattern.test(path.basename(file)));
  return match ? readFile(path.join(root, match), 'utf8') : '';
}

function firstParagraph(markdown) {
  return markdown.split(/\n\s*\n/).map((part) => part.trim()).find((part) => part && !part.startsWith('#'));
}

function parseArgs(argv) {
  const args = { format: 'json' };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--help' || value === '-h') args.help = true;
    else if (value === '--format') args.format = argv[++index] ?? 'json';
    else if (!args.repoDir) args.repoDir = value;
  }
  return args;
}
