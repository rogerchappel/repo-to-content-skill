# Changelog

## Unreleased

- Exclude dependency, generated-output, and version-control directories from
  repository evidence, claims, warnings, proof paths, and readiness scoring.
- Add an installed-tarball smoke check so release verification covers the
  packaged CLI binary after `npm install`.
- Reject unsupported CLI output formats with an explicit error.
- Extend package smoke coverage to parse the packaged CLI JSON output.

## 0.1.0

- Initial local-first repository-to-content brief generator.
