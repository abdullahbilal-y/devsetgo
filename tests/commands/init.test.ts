/**
 * devsetgo — Init Command Tests
 *
 * `init` writes into the user's working directory (a config file, a directory,
 * and an edit to .gitignore), so its guard rails need cover.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { initCommand } from '../../src/commands/init.js';

let workDir: string;

const configPath = (): string => join(workDir, 'devsetgo.config.yaml');

async function readConfig(): Promise<Record<string, any>> {
  return parseYaml(await readFile(configPath(), 'utf-8')) as Record<string, any>;
}

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'devsetgo-init-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('initCommand', () => {
  it('writes a parseable config file', async () => {
    await initCommand(workDir, {});

    expect(existsSync(configPath())).toBe(true);

    const config = await readConfig();
    expect(config.project).toBeDefined();
    expect(config.playground).toBeDefined();
    expect(config.readme).toBeDefined();
    expect(config.assets).toBeDefined();
  });

  it('creates the .devsetgo output directory', async () => {
    await initCommand(workDir, {});
    expect(existsSync(join(workDir, '.devsetgo'))).toBe(true);
  });

  it('auto-detects name, description, and install command from package.json', async () => {
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({ name: 'my-tool', description: 'Does a thing.' }),
      'utf-8',
    );

    await initCommand(workDir, {});
    const config = await readConfig();

    expect(config.project.name).toBe('my-tool');
    expect(config.project.description).toBe('Does a thing.');
    expect(config.readme.quick_start.install_command).toBe('npm install my-tool');
  });

  it('normalizes a git+https repository URL', async () => {
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({
        name: 'x',
        repository: { type: 'git', url: 'git+https://github.com/o/r.git' },
      }),
      'utf-8',
    );

    await initCommand(workDir, {});
    expect((await readConfig()).project.repo).toBe('https://github.com/o/r');
  });

  it('falls back to placeholders when package.json is absent', async () => {
    await initCommand(workDir, {});
    const config = await readConfig();

    expect(config.project.name).toBe('my-project');
    expect(config.project.repo).toContain('your-org');
  });

  it('survives an unparseable package.json rather than crashing', async () => {
    await writeFile(join(workDir, 'package.json'), '{ not json', 'utf-8');

    await expect(initCommand(workDir, {})).resolves.toBeUndefined();
    expect((await readConfig()).project.name).toBe('my-project');
  });

  it('detects languages from the files present', async () => {
    await mkdir(join(workDir, 'src'), { recursive: true });
    await writeFile(join(workDir, 'src', 'a.ts'), 'export const a = 1;\n', 'utf-8');
    await writeFile(join(workDir, 'src', 'b.py'), 'x = 1\n', 'utf-8');

    await initCommand(workDir, {});
    const languages = (await readConfig()).playground.languages as string[];

    expect(languages).toContain('typescript');
    expect(languages).toContain('python');
  });

  it('defaults to javascript when no source files are found', async () => {
    await initCommand(workDir, {});
    expect((await readConfig()).playground.languages).toEqual(['javascript']);
  });

  it('does not overwrite an existing config without --force', async () => {
    const sentinel = '# hand-tuned config\nproject:\n  name: do-not-touch\n';
    await writeFile(configPath(), sentinel, 'utf-8');

    await initCommand(workDir, {});

    expect(await readFile(configPath(), 'utf-8')).toBe(sentinel);
  });

  it('overwrites an existing config with --force', async () => {
    await writeFile(configPath(), 'project:\n  name: old\n', 'utf-8');

    await initCommand(workDir, { force: true });

    expect((await readConfig()).project.name).not.toBe('old');
  });

  it('appends .devsetgo/ to an existing .gitignore', async () => {
    await writeFile(join(workDir, '.gitignore'), 'node_modules/\n', 'utf-8');

    await initCommand(workDir, {});
    const gitignore = await readFile(join(workDir, '.gitignore'), 'utf-8');

    // The existing entries must survive the edit.
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('.devsetgo/');
  });

  it('does not duplicate the .gitignore entry on a second run', async () => {
    await writeFile(join(workDir, '.gitignore'), 'node_modules/\n.devsetgo/\n', 'utf-8');

    await initCommand(workDir, { force: true });
    const gitignore = await readFile(join(workDir, '.gitignore'), 'utf-8');

    expect(gitignore.match(/\.devsetgo\//g)).toHaveLength(1);
  });

  it('leaves the project alone when there is no .gitignore', async () => {
    await initCommand(workDir, {});
    expect(existsSync(join(workDir, '.gitignore'))).toBe(false);
  });

  it('emits a config the loader accepts round-trip', async () => {
    await initCommand(workDir, {});

    // The generated file must be valid input to devsetgo's own loader —
    // otherwise `init` followed by `build` fails on the very first run.
    const { loadConfig } = await import('../../src/utils/config.js');
    const loaded = await loadConfig(workDir, {});

    expect(loaded.playground.output_dir).toBe('.devsetgo/playground');
    expect(loaded.readme.output).toBe('README.md');
  });
});
