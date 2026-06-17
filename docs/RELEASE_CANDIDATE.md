# Release Candidate Notes

## Classification

Ship.

## Included

- Local CLI for repository evidence scanning.
- JSON and Markdown launch briefs.
- Fixture-backed tests.
- Agent skill instructions and orchestration notes.

## Verification

```bash
npm test
npm run check
npm run build
npm run smoke
bash scripts/validate.sh
```

## Known limits

- Git history analysis is a later task.
- Draft content still requires human approval before external use.
- The first release focuses on Node-style package metadata.
