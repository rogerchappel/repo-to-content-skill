# Orchestration

Run Repo To Content after a repository has passing local checks and before drafting launch material.

## Inputs

- Path to a local repository.
- Optional output format, `json` or `markdown`.

## Workflow

1. Run the repository's own verification commands.
2. Run `repo-to-content <repo-dir> --format markdown`.
3. Review warnings and remove unsupported claims.
4. Ask for human approval before using drafts externally.

## Side-effect boundary

The CLI only reads local files and writes to stdout and stderr. It does not post, publish, tag, open PRs, or write to third-party systems.
