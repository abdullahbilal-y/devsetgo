# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-09-03

A correctness and safety release. If you used 1.x against a real repository,
read the first entry below.

### Breaking changes

- **`readme` and `build` no longer overwrite a README they did not generate.**
  In 1.x, `devsetgo build` unconditionally replaced `README.md` in whatever
  directory it ran in, with no prompt and no backup. Every README devsetgo
  writes now carries a `<!-- devsetgo:generated -->` marker; a file without
  that marker is treated as hand-written and the command fails instead of
  destroying it. Pass `--force` to overwrite anyway (a `.bak` copy is kept),
  or set `readme.output` to write elsewhere. Regenerating a README devsetgo
  previously produced still works with no extra flags.

- **`build` now exits non-zero when a stage fails.** It previously logged the
  error, printed "Build Complete", and exited `0`, so a failed build passed CI.
  All stages still run even when an earlier one fails; the command reports
  which ones failed and exits `1`.

- **A malformed or missing config file is now a hard error.** `loadConfig`
  previously warned and silently fell back to defaults, generating confidently
  wrong output. An explicitly named `--config` file that does not exist, a
  config that fails to parse, and a config whose top level is not an object
  each raise a `ConfigError`.

- **`sharp` moved to `optionalDependencies` and `@mermaid-js/mermaid-cli` was
  removed as a dependency.** Both were already loaded lazily, but they were
  installed for everyone — mermaid-cli pulls a full Chromium via Puppeteer.
  Install shrinks by roughly 190 packages. PNG social cards require `sharp`
  (installed by default, skipped gracefully if the platform has no binary);
  SVG diagram rendering fetches mermaid-cli on demand via `npx`. The
  `.mermaid` sources and SVG cards are generated either way.

- **`quickjs-emscripten` removed from dependencies.** It was declared but never
  imported in Node — the playground loads QuickJS in the browser from a CDN.

- **Playground demo functions moved out of the public API.** `helloDevSetGo`,
  `calculateConversionROI`, `generateShieldsBadge`, `mockOpenAPIExplorer`, and
  `scratchpadSandbox` are no longer exported from the package entry point;
  they live in `src/demos.ts` as parser input for this repo's own docs site.

### Fixed

- **`serve --open` crashed every time.** It called `require('node:child_process')`
  from an ES module, where `require` is not defined. It now uses `spawn`
  without a shell, so a URL is never re-parsed by a command interpreter.

- **`serve` live-reload never worked and crashed the server.** The ping
  endpoint was registered as a second `request` listener, so it ran after the
  first handler had already ended the response and threw
  `ERR_HTTP_HEADERS_SENT`. There is now a single handler.

- **Live-reload would have reloaded the page every 1.5 seconds.** The endpoint
  returned `Date.now()`, which is always newer than the client's last-seen
  value. It now returns the playground's `index.html` mtime, so a reload fires
  on an actual rebuild.

- **Directory-traversal guard in `serve` was bypassable.** The check used a
  bare `startsWith(root)`, which accepts a sibling directory whose name begins
  with the root's (root `/site/play` admitted `/site/play-secret`). Requests
  are now decoded, checked for NUL bytes, and required to sit under
  `root + separator`.

- **Config file discovery never searched upward.** The loop bound compared
  against `dirname(startDir)`, so it terminated after one iteration and only
  ever looked in the starting directory. It now walks to the filesystem root.

- **`devsetgo --version` reported `1.0.0`** regardless of the installed
  version. It is now read from `package.json`.

- **`deepMerge` accepted `__proto__` from config files.** Keys that reach
  `Object.prototype` are now dropped.

- **Recursive snippets never auto-invoked.** The "is this function already
  called?" check searched the whole body, so `fib(n - 1)` counted as a call
  and the demo defined a function without running it. The check is now
  anchored at column zero.

- **Export-stripping in the browser runtime was a no-op.** The regexes were
  written with single backslashes inside a template literal, so `\s` collapsed
  to `s` and the emitted pattern was `/^exports+defaults+/`.

- **`renderMermaidToSVG` returned an absolute path** while every other entry
  in the same list was repo-relative. It also built a shell command by string
  concatenation; it now uses `execFile` with an argument array.

### Added

- **Execution timeout in the playground sandbox.** A snippet with an infinite
  loop previously hung the viewer's tab with no way out. QuickJS now runs with
  an interrupt handler and a 5-second budget.

- ESLint 9 (flat config, type-aware rules) and Prettier, replacing a `lint`
  script that only ran `tsc`. `npm run verify` runs the full gate.

- Coverage reporting with enforced thresholds (`npm run test:coverage`).

- End-to-end CLI tests that spawn the real entry point and assert on exit
  codes — previously every test called library functions directly, so flag
  wiring and exit codes were never exercised.

- Regression suites for the README overwrite guard, request-path containment,
  and config discovery and validation. Test count went from 63 to 120.

- CI now runs on Node 20/22/24 plus Windows, checks formatting and lint, and
  verifies the published tarball contains `dist/` and no source.

### Security

- **`sharp` bumped to ^0.35.0**, picking up patched libvips
  (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591). 1.x
  shipped `sharp@^0.33.0`, which carries a high-severity advisory.

- **`esbuild` pinned to ^0.28.2 via an override**, resolving a development-only
  advisory inherited through tsup, tsx, and vite. `npm audit` is clean.

### Changed

- **Releases are driven by git tags.** The previous workflow published on
  every push to `main` whenever `package.json` disagreed with the registry.
  Publishing now runs from a `v*.*.*` tag, verifies the tag matches
  `package.json`, and runs the full verification gate first.

- Removed `generateWASMRuntime()` — 90 lines of unreachable code that the test
  suite covered, which is part of why coverage looked healthier than it was.

- Asset generator no longer swallows every error; only genuinely optional
  renderers degrade to a warning.

- Test output writes to a temporary directory instead of the repository.

## [1.1.1] - 2026-08-28

- Initial public release.

[2.0.0]: https://github.com/abdullahbilal-y/devsetgo/releases/tag/v2.0.0
[1.1.1]: https://github.com/abdullahbilal-y/devsetgo/releases/tag/v1.1.1
