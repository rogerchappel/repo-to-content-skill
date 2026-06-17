# Repo To Content Skill

Repo To Content Skill generates evidence-backed launch briefs from local repositories. It scans README files, docs, tests, and package scripts, then drafts claims, demo commands, and post copy with proof paths.

## Quickstart

```bash
npm install
npm run build
node bin/repo-to-content.js fixtures/sample-repo --format markdown
```

## CLI

```bash
repo-to-content <repo-dir> [--format json|markdown]
```

The CLI writes the brief to stdout and warning counts to stderr. It does not post content or modify the repository.

## Output

- Evidence paths from README, docs, tests, and package metadata.
- Supported claims.
- Demo commands based on package scripts.
- Short and technical post drafts.
- Warnings for missing README, tests, or smoke scripts.
- A readiness score based on README, test, and smoke evidence.

## Safety notes

- Local filesystem read only.
- No external account writes.
- No package publishing.
- No social posting.
- Human review required before using drafts externally.

## Development

```bash
npm test
npm run check
npm run smoke
bash scripts/validate.sh
```
