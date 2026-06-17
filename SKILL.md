# Repo To Content Skill

Use this skill when an agent needs to prepare evidence-backed launch content, demo notes, or post drafts from a local repository.

## When to use

- After a repo has a working MVP and local verification commands.
- Before drafting launch posts, demo scripts, or release notes.
- When claims must be tied back to files in the repository.

## Required tools

- Node.js 20 or newer.
- Local filesystem access to the target repository.
- Optional shell access for running verification commands.

## Side-effect boundaries

This workflow is dry-run only. It reads local repository files and writes draft briefs to stdout. It must not post to social media, publish packages, tag releases, or mutate external accounts.

## Approval requirements

Human approval is required before using generated content externally or claiming verification that has not been run in the current repository.

## Examples

```bash
npm run build
node bin/repo-to-content.js fixtures/sample-repo --format markdown
node bin/repo-to-content.js /path/to/repo --format json
```

## Validation

Run `npm test`, `npm run check`, `npm run smoke`, and `bash scripts/validate.sh`.
