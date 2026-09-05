# devsetgo

[![CI](https://github.com/abdullahbilal-y/devsetgo/actions/workflows/ci.yml/badge.svg)](https://github.com/abdullahbilal-y/devsetgo/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/devsetgo)](https://www.npmjs.com/package/devsetgo)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A command-line tool that reads your source code and generates two things:

1. **A playground** — a web page where visitors can edit and run your code examples in their browser.
2. **Architecture diagrams** — drawn from the imports actually found in your files.

Both are generated from the code itself, so they stay correct when the code changes.

**[See a live playground →](https://abdullahbilal-y.github.io/devsetgo/)**

---

## The problem it solves

Two parts of a project's documentation go stale as soon as someone merges a pull request:

- **Hand-drawn architecture diagrams.** Someone draws the module layout once. Six months later the code has moved on, and the diagram is quietly wrong. Nobody notices, because a picture doesn't fail a test.
- **Code examples pasted into Markdown.** Copied out of a working file, then never run again. The real function grows a parameter, and the example in the README is now broken.

devsetgo reads the source instead of trusting a copy. The diagram comes from real `import` statements. The examples come from real functions. Regenerate it in CI and both stay true.

## Install

```bash
npm install -g devsetgo
```

Requires Node.js 20 or newer. Works on macOS, Linux, and Windows.

## Use it

```bash
devsetgo init        # create a config file
devsetgo build       # generate everything
devsetgo serve       # preview it locally at http://localhost:3000
```

To make a function appear in the playground, put a `@playground` comment above it:

```js
/**
 * @playground {"title": "Add two numbers", "runnable": true}
 */
export function add(a, b) {
  console.log(a + b);
}
```

That function now shows up as an editable, runnable example on the generated page.

## What each command does

| Command | What it does |
| --- | --- |
| `devsetgo init` | Scans your project and writes a `devsetgo.config.yaml` file |
| `devsetgo playground` | Builds the interactive web page |
| `devsetgo assets` | Builds architecture diagrams and social preview images |
| `devsetgo readme` | Fills a Markdown template from your config |
| `devsetgo build` | Runs all three of the above |
| `devsetgo serve` | Serves the playground locally and reloads when you rebuild |

## Honest limits

Worth knowing before you try it:

- **The playground can only run self-contained code.** Examples run in a sandbox with no network, no file access, and no `import`. A function that fetches data or reads a file will not work. This suits pure functions — validators, formatters, parsers, calculations.
- **It cannot demo tools like itself.** devsetgo writes files to disk, and the sandbox has no disk. Its own live playground shows unrelated sample code for that reason.
- **Only JavaScript and TypeScript examples run.** Python, Rust, and Go files are scanned for annotations and displayed, but the browser sandbox cannot execute them.
- **The README generator is a template filler.** It arranges text you wrote in a config file. It does not write prose for you.

## Configuration

`devsetgo init` writes a `devsetgo.config.yaml`. The parts you will actually edit:

```yaml
project:
  name: 'my-tool'
  description: 'What it does.'
  repo: 'https://github.com/you/my-tool'

playground:
  theme: 'dark' # or 'light'
  output_dir: '.devsetgo/playground'

assets:
  output_dir: 'assets'
```

If your network blocks public CDNs, point the playground at your own copy of the sandbox:

```yaml
playground:
  quickjs_sources:
    - 'https://internal-mirror.example.com/quickjs-emscripten.js'
```

## Documentation

- **[How it works](docs/ARCHITECTURE.md)** — the pipeline, stage by stage, in plain language
- **[Contributing](CONTRIBUTING.md)** — setup, checks, and release process
- **[Changelog](CHANGELOG.md)** — what changed in each version
- **[Example output](docs/example-generated-readme.md)** — a README this tool generated

---

## Topics covered

What this project is built from, and what each piece is for. Useful if you are reading the code to understand how a tool like this fits together.

### Language and runtime

| Topic | Where it shows up |
| --- | --- |
| **TypeScript (strict mode)** | Whole codebase. Strict mode means the compiler rejects unchecked `null`, implicit `any`, and unsafe assignments. |
| **ES modules (ESM)** | `"type": "module"`. Uses `import`/`export`, not `require`. This distinction caused a real bug — see below. |
| **Node.js APIs** | `node:fs`, `node:path`, `node:http`, `node:child_process` for file access, path handling, the dev server, and launching a browser. |

### Reading and understanding code

| Topic | Where it shows up |
| --- | --- |
| **Source parsing** | [`src/parser/code-parser.ts`](src/parser/code-parser.ts) finds `@playground` comments and pulls out the function under each one. |
| **TypeScript Compiler API** | [`src/playground/wasm-compiler.ts`](src/playground/wasm-compiler.ts) uses `ts.transpileModule` to strip type annotations. An earlier version used regular expressions and corrupted object literals — the real compiler cannot get this wrong. |
| **OpenAPI parsing** | [`src/parser/openapi-parser.ts`](src/parser/openapi-parser.ts) reads an API spec and lists its endpoints. |
| **Glob file discovery** | [`src/utils/file-system.ts`](src/utils/file-system.ts) finds source files while skipping `node_modules`, `dist`, and similar. |

### Running code safely

| Topic | Where it shows up |
| --- | --- |
| **WebAssembly** | The playground runs QuickJS — a small JavaScript engine compiled to WebAssembly — inside the browser. |
| **Sandboxing** | Visitor code runs in an isolated context with no network, no file access, and only `console` provided. |
| **Interrupt handling** | [`src/playground/runtime.ts`](src/playground/runtime.ts) sets a 5-second budget so an infinite loop cannot freeze the visitor's tab. |
| **Failover loading** | The sandbox loads from three pinned CDNs in order, so one outage does not break every published page. |

### Building a command-line tool

| Topic | Where it shows up |
| --- | --- |
| **CLI argument parsing** | [`src/cli.ts`](src/cli.ts) uses Commander for subcommands, flags, and help output. |
| **Exit codes** | A failed build exits non-zero. This matters because CI reads the exit code, not the log — a tool that prints an error but exits `0` shows up as a passing build. |
| **Lazy loading** | Each subcommand is imported only when it runs, so `--help` does not load the whole program. |
| **Configuration merging** | [`src/utils/config.ts`](src/utils/config.ts) layers CLI flags over a config file over defaults. |

### Writing files without destroying them

| Topic | Where it shows up |
| --- | --- |
| **Guarded writes** | [`src/readme/index.ts`](src/readme/index.ts) marks every file it generates. A file without that mark is treated as hand-written, and the tool refuses to overwrite it unless you pass `--force`. |
| **Backups** | `--force` writes a `.bak` copy first. |

Version 1 of this tool overwrote the `README.md` of any project it ran in, with no prompt and no backup. That is the single worst kind of bug a developer tool can have, and the guard above exists because of it.

### Serving files over HTTP

| Topic | Where it shows up |
| --- | --- |
| **Static file server** | [`src/commands/serve.ts`](src/commands/serve.ts) built directly on `node:http`, no framework. |
| **Path traversal defence** | A request for `../../etc/passwd` must not escape the served folder. URLs are decoded, checked for null bytes, and required to resolve inside the root. |
| **Live reload** | The page polls an endpoint for the build's timestamp and refreshes when it changes. |
| **Graceful shutdown** | `Ctrl+C` closes connections and exits cleanly. |

### Testing

| Topic | Where it shows up |
| --- | --- |
| **Unit tests** | Vitest, for individual functions. |
| **Integration tests** | [`tests/commands/serve.integration.test.ts`](tests/commands/serve.integration.test.ts) starts a real server on a real port and sends real requests. |
| **End-to-end tests** | [`tests/cli.e2e.test.ts`](tests/cli.e2e.test.ts) runs the actual command in a temporary folder and checks the exit code. |
| **Coverage thresholds** | The build fails if coverage drops below the set level, so tests cannot quietly rot. |
| **Test isolation** | Every test works in its own temporary directory and cleans up afterwards. |

A note worth remembering: the first version of this project had 63 passing tests and a bug that destroyed users' files. The tests covered the easy pure functions and none of the code that touched a disk or a network. Passing tests measure what you chose to test.

### Build and release

| Topic | Where it shows up |
| --- | --- |
| **Bundling** | tsup compiles TypeScript to a distributable bundle with type definitions. |
| **CI matrix** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on Node 20, 22, and 24, plus Windows — because path handling differs there. |
| **Tag-driven releases** | Publishing runs from a `v*.*.*` git tag, not from merging. A merge cannot ship a release by accident. |
| **npm provenance** | Publishes with a signed attestation linking the package to the exact commit that built it. |
| **Semantic versioning** | Breaking changes forced the `2.0.0` major bump. Shipping them as a patch would have auto-upgraded existing users into a broken build. |
| **Linting and formatting** | ESLint 9 flat config with type-aware rules, plus Prettier, both enforced in CI. |

### Two bugs worth understanding

These are good interview material because the cause is not obvious from reading the code.

**`require` inside an ES module.** `serve --open` called `require('node:child_process')`. In an ES module `require` does not exist, so the flag crashed every single time. Nothing caught it because no test ever passed `--open`.

**Escape characters inside a template literal.** The browser code is written inside a JavaScript template literal. In that context `\s` is not a special character — it collapses to a plain `s`. So a regular expression written as `/^export\s+/` was emitted as `/^exports+/` and silently never matched. The fix is doubling the backslash; the test asserts on the generated text, not the source.

---

## Development

```bash
git clone https://github.com/abdullahbilal-y/devsetgo.git
cd devsetgo
npm install
npm run verify   # formatting, linting, types, tests with coverage, build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

[MIT](LICENSE)
