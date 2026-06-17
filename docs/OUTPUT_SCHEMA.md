# Output Schema

The CLI emits a launch brief object in JSON mode.

- `title`: brief title.
- `generatedAt`: deterministic timestamp for stable tests.
- `summary`: repo description or README-derived summary.
- `proofPaths`: local files supporting the claims.
- `claims`: supported content claims.
- `demoCommands`: commands inferred from package scripts.
- `posts`: draft short and technical posts.
- `warnings`: missing evidence notes.
- `readiness`: score from zero to three.
