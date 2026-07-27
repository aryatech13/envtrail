# Contributing to EnvTrail

Thank you for helping make configuration failures less mysterious.

## Ways to contribute

- Add a language, framework, CI, or deployment adapter.
- Reduce a false positive with a focused fixture.
- Improve a remediation hint or accessibility detail.
- Test EnvTrail on an unusual monorepo and report the result.
- Help triage issues or review documentation.

Small pull requests are welcome. If a change affects the public result schema or
rule semantics, start with a Discussion or issue so we can agree on the shape.

## Development

Prerequisites: Node.js 22 or newer and npm.

```bash
git clone https://github.com/aryatech13/envtrail.git
cd envtrail
npm ci
npm test
```

Useful commands:

```bash
npm run dev -- check tests/fixtures/demo --fail-on never
npm run lint
npm test
npm run test:coverage
npm run build
npm run check
```

`dist/` is committed because GitHub Actions executes the bundled files directly.
Run `npm run build` and include the matching bundle when source behavior changes.

## Pull requests

1. Keep each PR focused.
2. Add or update tests for behavior changes.
3. Do not include real credentials, live `.env` files, or copied private
   configuration—even in fixtures.
4. Update the adapter or rule docs when behavior changes.
5. Add an entry under `Unreleased` in `CHANGELOG.md` for user-visible changes.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Adapter quality bar

An adapter must retain only variable names and locations. It must not retain,
log, snapshot, or report values. Prefer a conservative unresolved finding over
guessing a dynamic name.

Tests should include:

- normal syntax;
- whitespace and quoting variants;
- one negative or dynamic case; and
- an assertion that a representative value is absent from serialized facts.

Read [docs/architecture.md](docs/architecture.md) before adding a new scanner.

## Review and release

Maintainers aim to acknowledge issues within seven days. Reviews consider user
impact, privacy, backwards compatibility, and maintenance cost. Releases follow
semantic versioning.
