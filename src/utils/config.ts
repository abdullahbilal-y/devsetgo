/**
 * devsetgo — Configuration Loader
 *
 * Loads, validates, and merges devsetgo.config.yaml with CLI flags.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { log } from './logger.js';
import type { DevSetGoConfig } from '../parser/types.js';

/**
 * Raised for user-facing configuration problems (missing file, bad syntax).
 * The CLI prints the message without a stack trace and exits non-zero.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/** Default config file names to search for */
const CONFIG_FILE_NAMES = [
  'devsetgo.config.yaml',
  'devsetgo.config.yml',
  'devsetgo.config.json',
  '.devsetgorc.yaml',
  '.devsetgorc.yml',
];

/** Default configuration values */
const DEFAULT_CONFIG: DevSetGoConfig = {
  project: {
    name: '',
    description: '',
    repo: '',
    website: '',
    version: '1.0.0',
  },
  playground: {
    theme: 'dark',
    title: 'Interactive Playground',
    languages: ['javascript'],
    api_base_url: '',
    output_dir: '.devsetgo/playground',
  },
  readme: {
    cro_enabled: true,
    output: 'README.md',
    format: 'github',
    hero: {
      tagline: '',
      badges: [],
    },
    problem: '',
    solution: '',
    quick_start: {
      install_command: '',
      first_run: '',
    },
    features: [],
    metrics: [],
  },
  cta: {
    install: {
      command: '',
      label: 'Get Started',
    },
    enterprise: {
      enabled: false,
      url: '',
      label: 'Book Enterprise Demo',
      description: '',
    },
  },
  assets: {
    output_dir: 'assets',
    diagrams: {
      enabled: true,
      format: 'all',
      auto_detect: true,
    },
    social_cards: {
      enabled: true,
      theme: 'dark',
      sizes: [
        { name: 'og', width: 1200, height: 630 },
        { name: 'twitter', width: 1200, height: 675 },
        { name: 'github', width: 800, height: 400 },
      ],
    },
  },
};

/**
 * Find the config file by searching upward from the given directory.
 */
export async function findConfigFile(startDir: string): Promise<string | null> {
  let dir = resolve(startDir);

  // Walk upward until the filesystem root, where dirname(dir) === dir.
  for (;;) {
    for (const name of CONFIG_FILE_NAMES) {
      const filePath = join(dir, name);
      if (existsSync(filePath)) {
        return filePath;
      }
    }

    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Load and parse a config file.
 */
async function loadConfigFile(filePath: string): Promise<Partial<DevSetGoConfig>> {
  const content = await readFile(filePath, 'utf-8');

  if (filePath.endsWith('.json')) {
    return JSON.parse(content);
  }

  return parseYaml(content) as Partial<DevSetGoConfig>;
}

/** Keys that must never be copied from user config into a merged object. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Deep merge two objects, with source values overriding target values.
 *
 * Keys that could reach `Object.prototype` are dropped, so a hostile or
 * malformed config file cannot pollute the prototype chain.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (FORBIDDEN_KEYS.has(key)) continue;

    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal !== undefined &&
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal) &&
      targetVal !== null
    ) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal;
    }
  }

  return result;
}

/**
 * CLI option overrides that take precedence over file config.
 */
export interface CLIOverrides {
  config?: string;
  output?: string;
  verbose?: boolean;
  theme?: 'dark' | 'light' | 'auto';
  format?: 'github' | 'gitlab';
}

/**
 * Load the devsetgo configuration.
 *
 * Priority: CLI flags > config file > defaults
 */
export async function loadConfig(
  cwd: string,
  overrides: CLIOverrides = {},
): Promise<DevSetGoConfig> {
  // 1. Find config file
  const configPath = overrides.config ? resolve(cwd, overrides.config) : await findConfigFile(cwd);

  // An explicitly requested config file that does not exist is an error —
  // silently falling back to defaults hides the user's typo.
  if (overrides.config && (!configPath || !existsSync(configPath))) {
    throw new ConfigError(`Config file not found: ${overrides.config}`);
  }

  let fileConfig: Partial<DevSetGoConfig> = {};

  if (configPath && existsSync(configPath)) {
    log.debug(`Loading config from ${configPath}`);
    try {
      fileConfig = await loadConfigFile(configPath);
    } catch (err) {
      // A config file that exists but cannot be parsed is a hard failure:
      // continuing with defaults would silently produce the wrong output.
      throw new ConfigError(
        `Failed to parse config file: ${configPath}
  ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (fileConfig === null || typeof fileConfig !== 'object' || Array.isArray(fileConfig)) {
      throw new ConfigError(`Config file must contain a top-level object: ${configPath}`);
    }
  } else {
    log.debug('No config file found, using defaults');
  }

  // 2. Merge: defaults ← file config
  let config: DevSetGoConfig = deepMerge(DEFAULT_CONFIG, fileConfig);

  // 3. Apply CLI overrides
  if (overrides.output) {
    config.playground.output_dir = overrides.output;
  }
  if (overrides.theme) {
    config.playground.theme = overrides.theme;
  }
  if (overrides.format) {
    config.readme.format = overrides.format;
  }

  // 4. Auto-detect project info if missing
  if (!config.project.name || !config.project.repo) {
    config = await autoDetectProjectInfo(cwd, config);
  }

  return config;
}

/**
 * Attempt to auto-detect project name and repo from package.json or git.
 */
async function autoDetectProjectInfo(cwd: string, config: DevSetGoConfig): Promise<DevSetGoConfig> {
  const packageJsonPath = join(cwd, 'package.json');

  if (existsSync(packageJsonPath)) {
    try {
      const raw = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(raw);

      if (!config.project.name && pkg.name) {
        config.project.name = pkg.name;
        log.debug(`Auto-detected project name: ${pkg.name}`);
      }
      if (!config.project.description && pkg.description) {
        config.project.description = pkg.description;
      }
      if (!config.project.version && pkg.version) {
        config.project.version = pkg.version;
      }
      if (!config.project.repo && pkg.repository) {
        const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository.url;
        if (repo) {
          config.project.repo = repo.replace(/^git\+/, '').replace(/\.git$/, '');
          log.debug(`Auto-detected repo: ${config.project.repo}`);
        }
      }
    } catch {
      log.debug('Could not parse package.json for auto-detection');
    }
  }

  return config;
}

export default loadConfig;
