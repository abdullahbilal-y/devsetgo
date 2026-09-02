/**
 * devsetgo — README Overwrite Guard Tests
 *
 * Regression cover for the worst bug this package shipped: `devsetgo build`
 * unconditionally overwrote the README of whatever repo it ran in.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateReadme, ReadmeOverwriteError, GENERATED_MARKER } from '../../src/readme/index.js';
import { loadConfig } from '../../src/utils/config.js';
import type { ProjectManifest, DevSetGoConfig } from '../../src/parser/types.js';

let workDir: string;

const HANDWRITTEN = '# My Very Important Project\n\nYears of documentation.\n';

const emptyManifest = (): ProjectManifest =>
  ({
    project: { name: 'demo', description: 'demo project', version: '1.0.0' },
    codeSnippets: [],
    apiEndpoints: [],
    docSections: [],
    modules: [],
    dependencies: [],
  }) as unknown as ProjectManifest;

async function config(): Promise<DevSetGoConfig> {
  return loadConfig(workDir, {});
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'devsetgo-readme-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('README overwrite guard', () => {
  it('writes freely when no README exists', async () => {
    const result = await generateReadme(workDir, emptyManifest(), await config());

    expect(existsSync(result.outputPath)).toBe(true);
    expect(await readFile(result.outputPath, 'utf-8')).toContain(GENERATED_MARKER);
  });

  it('refuses to overwrite a hand-written README', async () => {
    const readmePath = join(workDir, 'README.md');
    await writeFile(readmePath, HANDWRITTEN, 'utf-8');

    await expect(generateReadme(workDir, emptyManifest(), await config())).rejects.toBeInstanceOf(
      ReadmeOverwriteError,
    );

    // The critical assertion: the user's file is byte-for-byte untouched.
    expect(await readFile(readmePath, 'utf-8')).toBe(HANDWRITTEN);
  });

  it('names the offending path and the escape hatches in the error', async () => {
    await writeFile(join(workDir, 'README.md'), HANDWRITTEN, 'utf-8');

    await expect(generateReadme(workDir, emptyManifest(), await config())).rejects.toThrow(
      /--force/,
    );
  });

  it('overwrites with --force, keeping a .bak of the original', async () => {
    const readmePath = join(workDir, 'README.md');
    await writeFile(readmePath, HANDWRITTEN, 'utf-8');

    await generateReadme(workDir, emptyManifest(), await config(), { force: true });

    expect(await readFile(readmePath, 'utf-8')).toContain(GENERATED_MARKER);
    expect(await readFile(`${readmePath}.bak`, 'utf-8')).toBe(HANDWRITTEN);
  });

  it('regenerates its own output without --force and without a .bak', async () => {
    const cfg = await config();

    const first = await generateReadme(workDir, emptyManifest(), cfg);
    await generateReadme(workDir, emptyManifest(), cfg);

    expect(await readFile(first.outputPath, 'utf-8')).toContain(GENERATED_MARKER);
    expect(existsSync(`${first.outputPath}.bak`)).toBe(false);
  });

  it('respects a redirected output path and leaves README.md alone', async () => {
    const readmePath = join(workDir, 'README.md');
    await writeFile(readmePath, HANDWRITTEN, 'utf-8');

    const cfg = await config();
    cfg.readme.output = 'DRAFT.md';

    const result = await generateReadme(workDir, emptyManifest(), cfg);

    expect(result.outputPath).toBe(join(workDir, 'DRAFT.md'));
    expect(await readFile(readmePath, 'utf-8')).toBe(HANDWRITTEN);
  });
});
