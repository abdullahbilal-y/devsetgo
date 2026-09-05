# Contributing to devsetgo

Thanks for taking a look. This page covers how to set the project up, what
the checks do, and how a release happens.

## Getting Started

### Prerequisites

- **Node.js** 20 or higher
- **npm** 9 or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/abdullahbilal-y/devsetgo.git
cd devsetgo

# Install dependencies
npm install

# Build the CLI
npm run build

# Run tests
npm test

# Type-check
npm run typecheck
```

### Local Development

For live-reloading during development:

```bash
npm run dev -- --help
npm run dev -- init
npm run dev -- build
```

## Project Structure

```
src/
├── cli.ts              Entry point. Defines every command and its flags.
├── index.ts            What the package exports when used as a library.
├── commands/           One file per command (build, serve, init, ...).
├── parser/             Reads your project: code, OpenAPI files, Markdown.
├── playground/         Builds the web page and the browser runtime.
├── readme/             Fills the Markdown template.
├── assets/             Draws diagrams and social preview images.
└── utils/              Config loading, file helpers, logging.

tests/
├── cli.e2e.test.ts     Runs the real command, checks the exit code.
├── pipeline.test.ts    Parsing through to generation.
├── commands/           Per-command tests, including a live HTTP server.
├── parser/             Parser tests.
├── playground/         Playground and browser-runtime tests.
├── readme/             README generator tests.
└── fixtures/           Sample files the tests read.
```

For how the pieces fit together, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Submitting Changes

1. **Fork** the repository and create a feature branch:

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Write tests** for your changes in the appropriate `tests/` directory.

3. **Ensure all checks pass**:

   ```bash
   npm run verify      # format + lint + typecheck + coverage + build
   ```

   Or run the pieces individually:

   ```bash
   npm run format      # Apply Prettier formatting
   npm run lint        # ESLint, including type-aware rules
   npm run typecheck   # TypeScript type-check
   npm run test:coverage  # Test suite with coverage thresholds
   npm run build       # Verify build succeeds
   ```

   What each check is for:

   | Check           | Why it exists                               |
   | --------------- | ------------------------------------------- |
   | `format:check`  | Keeps formatting out of code review.        |
   | `lint`          | Catches unused code and unhandled promises. |
   | `typecheck`     | Confirms the types are sound.               |
   | `test:coverage` | Runs the tests and fails if coverage drops. |
   | `build`         | Confirms the package still compiles.        |

   Coverage thresholds are a ratchet: raise them as the test suite grows, and
   never lower one to turn a red run green.

4. **Commit** with a conventional commit message:

   ```
   feat: add Python WASM execution via Pyodide
   fix: handle empty OpenAPI paths gracefully
   docs: improve @playground annotation examples
   test: add template engine tests
   ```

5. **Open a Pull Request** against `main` with a clear description of what changed and why.

## Code Style

Formatting is handled by Prettier and enforced in CI — run `npm run format`
rather than adjusting whitespace by hand.

- TypeScript strict mode is enabled — no `any` without a comment explaining why
- Keep functions focused and under ~100 lines
- Add JSDoc to all exported functions and types
- Use `log.xxx()` from `src/utils/logger.ts` (not `console.log`) in CLI code

### Two things that are easy to get wrong

**Never write to a user's files without a guard.** Anything that writes into
the directory the CLI was invoked in must either write to a devsetgo-owned
output path or check that it is not clobbering something a human authored.
`src/readme/index.ts` shows the marker-and-`--force` pattern.

**The playground client code lives inside a template literal**
(`src/playground/runtime.ts`), so every backslash that must survive into the
emitted browser JavaScript has to be doubled. A single `\s` silently collapses
to `s`, producing a regex that never matches. `tests/playground/runtime.test.ts`
asserts on the emitted string to catch this.

## Releasing

Releases are tag-driven. Pushing to `main` does not publish.

1. Update `CHANGELOG.md` with the new version's entries.
2. Bump the version: `npm version <major|minor|patch>`.
3. Push the commit and the tag: `git push && git push --tags`.

The `Release` workflow verifies that the tag matches `package.json`, runs the
full `verify` gate, and publishes to npm with provenance.

## Reporting Bugs

Open a GitHub Issue with:

- Your Node.js and npm versions (`node -v`, `npm -v`)
- The command you ran and the full error output
- Your `devsetgo.config.yaml` (if relevant, redact secrets)

## Feature Requests

Open a GitHub Discussion or Issue with:

- A clear use case description
- What you expected vs. what happened (or what's missing)
- Any references to similar tools that do what you want

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
