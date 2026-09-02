/**
 * devsetgo — Configuration Loader Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, findConfigFile, ConfigError } from '../../src/utils/config.js';

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'devsetgo-config-'));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe('findConfigFile', () => {
  it('finds a config in the starting directory', async () => {
    const configPath = join(workDir, 'devsetgo.config.yaml');
    await writeFile(configPath, 'project:\n  name: here\n', 'utf-8');

    expect(await findConfigFile(workDir)).toBe(configPath);
  });

  it('walks up several levels to find the config', async () => {
    // The old loop compared against dirname(startDir), so it gave up after a
    // single directory and never actually searched upward.
    const configPath = join(workDir, 'devsetgo.config.yaml');
    await writeFile(configPath, 'project:\n  name: root\n', 'utf-8');

    const deep = join(workDir, 'packages', 'app', 'src');
    await mkdir(deep, { recursive: true });

    expect(await findConfigFile(deep)).toBe(configPath);
  });

  it('returns null when no config exists anywhere up the tree', async () => {
    const deep = join(workDir, 'a', 'b');
    await mkdir(deep, { recursive: true });

    // tmpdir has no devsetgo config above it, so this terminates at the root.
    expect(await findConfigFile(deep)).toBeNull();
  });
});

describe('loadConfig', () => {
  it('returns defaults when no config file is present', async () => {
    const config = await loadConfig(workDir, {});

    expect(config.playground.theme).toBe('dark');
    expect(config.readme.output).toBe('README.md');
  });

  it('merges file values over defaults without dropping siblings', async () => {
    await writeFile(
      join(workDir, 'devsetgo.config.yaml'),
      'playground:\n  theme: light\n',
      'utf-8',
    );

    const config = await loadConfig(workDir, {});

    expect(config.playground.theme).toBe('light');
    // Untouched keys in the same section must survive the merge.
    expect(config.playground.output_dir).toBe('.devsetgo/playground');
  });

  it('lets CLI overrides win over the config file', async () => {
    await writeFile(
      join(workDir, 'devsetgo.config.yaml'),
      'playground:\n  theme: light\n',
      'utf-8',
    );

    const config = await loadConfig(workDir, { theme: 'dark' });
    expect(config.playground.theme).toBe('dark');
  });

  it('throws when an explicitly named config file is missing', async () => {
    await expect(loadConfig(workDir, { config: 'nope.yaml' })).rejects.toBeInstanceOf(ConfigError);
  });

  it('throws on malformed YAML instead of silently using defaults', async () => {
    // Falling back to defaults here would generate confidently wrong output.
    await writeFile(
      join(workDir, 'devsetgo.config.yaml'),
      'project:\n\tname: [unclosed\n',
      'utf-8',
    );

    await expect(loadConfig(workDir, {})).rejects.toBeInstanceOf(ConfigError);
  });

  it('throws when the config file is not a top-level object', async () => {
    await writeFile(join(workDir, 'devsetgo.config.yaml'), '- just\n- a\n- list\n', 'utf-8');

    await expect(loadConfig(workDir, {})).rejects.toBeInstanceOf(ConfigError);
  });

  it('ignores __proto__ in a config file rather than polluting the prototype', async () => {
    await writeFile(
      join(workDir, 'devsetgo.config.json'),
      JSON.stringify({ __proto__: { polluted: true } }),
      'utf-8',
    );

    await loadConfig(workDir, {});

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('auto-detects project name from package.json', async () => {
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({ name: 'detected-name', version: '3.1.4' }),
      'utf-8',
    );

    const config = await loadConfig(workDir, {});
    expect(config.project.name).toBe('detected-name');
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

    const config = await loadConfig(workDir, {});
    expect(config.project.repo).toBe('https://github.com/o/r');
  });
});
