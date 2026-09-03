/**
 * devsetgo — Pipeline Tests
 *
 * Covers the orchestrators and command wrappers: the seams where parsing,
 * generation, and config loading meet. These read as thin glue, but they are
 * where the CLI's flags actually take effect.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseProject } from '../src/parser/index.js';
import { generatePlayground } from '../src/playground/index.js';
import { generateAssets } from '../src/assets/index.js';
import { loadConfig } from '../src/utils/config.js';
import { playgroundCommand } from '../src/commands/playground.js';
import { readmeCommand } from '../src/commands/readme.js';
import { assetsCommand } from '../src/commands/assets.js';
import { buildCommand } from '../src/commands/build.js';

let workDir: string;

const SAMPLE_SOURCE = [
  '/**',
  ' * @playground {"title":"Adder","category":"math","runnable":true}',
  ' * Adds two numbers.',
  ' */',
  'export function add(a, b) {',
  '  console.log(a + b);',
  '}',
  '',
].join('\n');

async function scaffold(): Promise<void> {
  await writeFile(
    join(workDir, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.0.0', description: 'A fixture project.' }),
    'utf-8',
  );
  await mkdir(join(workDir, 'src'), { recursive: true });
  await writeFile(join(workDir, 'src', 'math.js'), SAMPLE_SOURCE, 'utf-8');
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'devsetgo-pipeline-'));
  await scaffold();
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('parseProject', () => {
  it('discovers annotated snippets from source files', async () => {
    const config = await loadConfig(workDir, {});
    const manifest = await parseProject(workDir, config);

    const titles = manifest.codeSnippets.map((s) => s.title);
    expect(titles).toContain('Adder');
  });

  it('reports project metadata from package.json', async () => {
    const config = await loadConfig(workDir, {});
    const manifest = await parseProject(workDir, config);

    expect(manifest.project.name).toBe('fixture');
  });

  it('returns empty collections for an empty project', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'devsetgo-empty-'));
    try {
      const config = await loadConfig(empty, {});
      const manifest = await parseProject(empty, config);

      expect(manifest.codeSnippets).toEqual([]);
      expect(manifest.apiEndpoints).toEqual([]);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });
});

describe('generatePlayground', () => {
  it('writes index.html and snippets.json', async () => {
    const config = await loadConfig(workDir, {});
    const manifest = await parseProject(workDir, config);
    const result = await generatePlayground(workDir, manifest, config);

    expect(existsSync(join(result.outputDir, 'index.html'))).toBe(true);
    expect(existsSync(join(result.outputDir, 'snippets.json'))).toBe(true);
    expect(result.totalSize).toBeGreaterThan(0);
  });

  it('emits the configured QuickJS sources into the page', async () => {
    const config = await loadConfig(workDir, {});
    config.playground.quickjs_sources = ['https://example.test/quickjs.js'];

    const manifest = await parseProject(workDir, config);
    const result = await generatePlayground(workDir, manifest, config);
    const html = await readFile(join(result.outputDir, 'index.html'), 'utf-8');

    expect(html).toContain('__DEVSETGO_QUICKJS_SOURCES__');
    expect(html).toContain('https://example.test/quickjs.js');
  });

  it('falls back to a welcome example when no snippets are found', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'devsetgo-empty-'));
    try {
      const config = await loadConfig(empty, {});
      const manifest = await parseProject(empty, config);
      const result = await generatePlayground(empty, manifest, config);

      const snippets = JSON.parse(
        await readFile(join(result.outputDir, 'snippets.json'), 'utf-8'),
      ) as unknown[];

      expect(snippets).toHaveLength(1);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });
});

describe('generateAssets', () => {
  it('honours the enabled flags', async () => {
    const config = await loadConfig(workDir, {});
    config.assets.diagrams.enabled = false;
    config.assets.social_cards.enabled = false;

    const manifest = await parseProject(workDir, config);
    const result = await generateAssets(workDir, manifest, config);

    expect(result.diagrams).toEqual([]);
    expect(result.socialCards).toEqual([]);
  });

  it('generates mermaid sources without the optional SVG renderer', async () => {
    const config = await loadConfig(workDir, {});
    config.assets.social_cards.enabled = false;
    // 'mermaid' skips the npx mermaid-cli render, which is the optional path.
    config.assets.diagrams.format = 'mermaid';

    const manifest = await parseProject(workDir, config);
    const result = await generateAssets(workDir, manifest, config);

    expect(result.diagrams.every((f) => f.type === 'mermaid')).toBe(true);
  });
});

describe('command wrappers', () => {
  it('playgroundCommand honours --theme', async () => {
    await playgroundCommand(workDir, { theme: 'light' });

    const html = await readFile(join(workDir, '.devsetgo', 'playground', 'index.html'), 'utf-8');
    expect(html).toContain('data-theme="light"');
  });

  it('playgroundCommand honours --output', async () => {
    await playgroundCommand(workDir, { output: 'custom-out' });
    expect(existsSync(join(workDir, 'custom-out', 'index.html'))).toBe(true);
  });

  it('readmeCommand writes a README', async () => {
    await readmeCommand(workDir, {});

    const readme = await readFile(join(workDir, 'README.md'), 'utf-8');
    expect(readme).toContain('devsetgo:generated');
  });

  it('readmeCommand with --no-cro produces the simple layout', async () => {
    await readmeCommand(workDir, { cro: false });

    const readme = await readFile(join(workDir, 'README.md'), 'utf-8');
    expect(readme).toContain('## Quick Start');
  });

  it('assetsCommand --type diagrams skips social cards', async () => {
    await assetsCommand(workDir, { type: 'diagrams' });

    expect(existsSync(join(workDir, 'assets', 'social'))).toBe(false);
  });

  it('assetsCommand --type cards skips diagrams', async () => {
    await assetsCommand(workDir, { type: 'cards' });

    expect(existsSync(join(workDir, 'assets', 'diagrams'))).toBe(false);
  });

  it('buildCommand runs the full pipeline and resolves', async () => {
    await expect(buildCommand(workDir, { skipAssets: true })).resolves.toBeUndefined();

    expect(existsSync(join(workDir, 'README.md'))).toBe(true);
    expect(existsSync(join(workDir, '.devsetgo', 'playground', 'index.html'))).toBe(true);
  });

  it('buildCommand throws when the README stage fails', async () => {
    await writeFile(join(workDir, 'README.md'), '# Hand written\n', 'utf-8');

    await expect(buildCommand(workDir, { skipAssets: true })).rejects.toThrow(/Build failed/);
  });

  it('buildCommand still builds the playground after an earlier stage fails', async () => {
    await writeFile(join(workDir, 'README.md'), '# Hand written\n', 'utf-8');

    await expect(buildCommand(workDir, { skipAssets: true })).rejects.toThrow();
    expect(existsSync(join(workDir, '.devsetgo', 'playground', 'index.html'))).toBe(true);
  });

  it('buildCommand honours every skip flag together', async () => {
    await buildCommand(workDir, {
      skipReadme: true,
      skipPlayground: true,
      skipAssets: true,
    });

    expect(existsSync(join(workDir, 'README.md'))).toBe(false);
    expect(existsSync(join(workDir, '.devsetgo', 'playground'))).toBe(false);
  });
});
