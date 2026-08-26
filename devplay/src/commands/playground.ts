/**
 * devplay — Playground Command
 *
 * Standalone interactive playground generation.
 */

import { resolve } from 'node:path';
import { log } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';
import { parseProject } from '../parser/index.js';
import { generatePlayground } from '../playground/index.js';
import { formatBytes } from '../utils/file-system.js';

interface PlaygroundOptions {
  config?: string;
  output?: string;
  verbose?: boolean;
  theme?: 'dark' | 'light' | 'auto';
  singleFile?: boolean;
}

export async function playgroundCommand(cwd: string, options: PlaygroundOptions): Promise<void> {
  const absRoot = resolve(cwd);
  log.banner('devplay playground');

  // Load config
  const config = await loadConfig(absRoot, {
    config: options.config,
    output: options.output,
    theme: options.theme,
  });

  // Parse project
  log.info('Parsing project sources...');
  const manifest = await parseProject(absRoot, config);

  // Generate playground
  log.info('Building interactive playground...');
  const result = await generatePlayground(absRoot, manifest, config);

  log.success(`Playground built: ${result.outputDir}`);
  log.info(`Files generated: ${result.files.length} (${formatBytes(result.totalSize)})`);
}
