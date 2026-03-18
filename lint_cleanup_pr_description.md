## Summary

This PR performs a project-wide cleanup of `eslint-disable` directives. It
removes dozens of unused comments that were no longer necessary. This is
especially important because our pre-commit hooks were attempting to remove
these automatically, which was causing unintended changes and polluting other
unrelated PRs.

## Details

Over time, code changes (such as dependency updates or refactors) can render
existing `eslint-disable` comments redundant.

Previously, when these redundant comments were present, the `lint-staged`
pre-commit hook would automatically strip them during the `eslint --fix` phase.
This led to a "messy" development experience where committing a change to one
file would often pull in unrelated "cleanup" changes to other files.

This PR:

- Proactively removes these unused `// eslint-disable-next-line` comments across
  17 files.
- "Stabilizes" the codebase so that future commits are cleaner and only contain
  intended logic changes.
- Ensures that linting rules are properly enforced where those comments were
  previously hiding potential issues.

## Related Issues

N/A

## How to Validate

### Automated Checks

Run the project-wide lint command:

```bash
npm run lint
```

The output should be clean.

Run the preflight check to ensure no regressions:

```bash
npm run preflight
```

## Pre-Merge Checklist

- [ ] Updated relevant documentation and README (if needed)
- [ ] Added/updated tests (if needed)
- [ ] Noted breaking changes (if any)
- [x] Validated on required platforms/methods:
  - [x] MacOS
    - [x] npm run
    - [ ] npx
    - [ ] Docker
    - [ ] Podman
    - [ ] Seatbelt
  - [ ] Windows
    - [ ] npm run
    - [ ] npx
    - [ ] Docker
  - [ ] Linux
    - [ ] npm run
    - [ ] npx
    - [ ] Docker
