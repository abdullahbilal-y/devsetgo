/**
 * devsetgo — CLI End-to-End Tests
 *
 * Runs the real entry point in a throwaway project directory. This is the
 * layer that was entirely untested: every previous suite called library
 * functions directly, so exit codes and flag wiring were never exercised.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const cliEntry = join(repoRoot, 'src', 'cli.ts');

let workDir: string;

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Run the CLI in `workDir`, capturing output and the real exit code. */
async function runCli(args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync('npx', ['tsx', cliEntry, ...args], {
      cwd: workDir,
      shell: process.platform === 'win32',
      timeout: 120_000,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

beforeAll(() => {
  // tsx compiles on the fly; the first invocation is the slow one.
  expect(existsSync(cliEntry)).toBe(true);
});

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'devsetgo-e2e-'));
  await writeFile(
    join(workDir, 'package.json'),
    JSON.stringify({ name: 'fixture-project', version: '0.1.0', description: 'A fixture.' }),
    'utf-8',
  );
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('devsetgo CLI', () => {
  it('reports the version from package.json', async () => {
    const pkg = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf-8')) as {
      version: string;
    };

    const { code, stdout } = await runCli(['--version']);

    expect(code).toBe(0);
    // The version was previously hardcoded and had drifted from the manifest.
    expect(stdout.trim()).toBe(pkg.version);
  });

  it('exits 0 and prints usage for --help', async () => {
    const { code, stdout } = await runCli(['--help']);

    expect(code).toBe(0);
    expect(stdout).toContain('devsetgo');
    expect(stdout).toContain('playground');
  });

  it('exits non-zero for an unknown command', async () => {
    const { code } = await runCli(['definitely-not-a-command']);
    expect(code).not.toBe(0);
  });

  it('exits non-zero when a named config file is missing', async () => {
    const { code } = await runCli(['readme', '--config', 'missing.yaml']);
    expect(code).not.toBe(0);
  });

  it('refuses to clobber a hand-written README and exits non-zero', async () => {
    const readmePath = join(workDir, 'README.md');
    const original = '# Hand written\n\nDo not destroy me.\n';
    await writeFile(readmePath, original, 'utf-8');

    const { code } = await runCli(['readme']);

    expect(code).not.toBe(0);
    expect(await readFile(readmePath, 'utf-8')).toBe(original);
  });

  it('overwrites the README with --force and leaves a backup', async () => {
    const readmePath = join(workDir, 'README.md');
    const original = '# Hand written\n';
    await writeFile(readmePath, original, 'utf-8');

    const { code } = await runCli(['readme', '--force']);

    expect(code).toBe(0);
    expect(await readFile(readmePath, 'utf-8')).toContain('devsetgo:generated');
    expect(await readFile(`${readmePath}.bak`, 'utf-8')).toBe(original);
  });

  it('builds a playground into the output directory', async () => {
    await mkdir(join(workDir, 'src'), { recursive: true });
    await writeFile(
      join(workDir, 'src', 'sample.js'),
      '/**\n * @playground {"title":"Demo","runnable":true}\n */\nfunction demo() { console.log(1); }\n',
      'utf-8',
    );

    const { code } = await runCli(['playground']);

    expect(code).toBe(0);
    expect(existsSync(join(workDir, '.devsetgo', 'playground', 'index.html'))).toBe(true);
  });

  it('exits non-zero when a build stage fails', async () => {
    // A hand-written README makes the readme stage fail; the build must
    // surface that rather than printing "Build Complete" and exiting 0.
    await writeFile(join(workDir, 'README.md'), '# Mine\n', 'utf-8');

    const { code } = await runCli(['build', '--skip-assets']);

    expect(code).not.toBe(0);
  });

  it('still runs remaining stages when one fails', async () => {
    await writeFile(join(workDir, 'README.md'), '# Mine\n', 'utf-8');

    const { code } = await runCli(['build', '--skip-assets']);

    expect(code).not.toBe(0);
    // The playground stage runs after the failing readme stage.
    expect(existsSync(join(workDir, '.devsetgo', 'playground', 'index.html'))).toBe(true);
  });

  it('exits 0 for a clean build', async () => {
    const { code } = await runCli(['build', '--skip-assets']);
    expect(code).toBe(0);
  });

  it('rejects an out-of-range port', async () => {
    const { code } = await runCli(['serve', '--port', '99999']);
    expect(code).not.toBe(0);
  });
});
