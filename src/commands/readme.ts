/**
 * devsetgo — README Command
 *
 * Standalone CRO-optimized README generation.
 */

import { resolve } from 'node:path';
import { log } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';
import { parseProject } from '../parser/index.js';
import { generateReadme } from '../readme/index.js';

interface ReadmeOptions {
  config?: string;
  output?: string;
  verbose?: boolean;
  format?: 'github' | 'gitlab';
  cta?: 'dual' | 'install-only' | 'enterprise-only';
  cro?: boolean;
  force?: boolean;
}

export async function readmeCommand(cwd: string, options: ReadmeOptions): Promise<void> {
  const absRoot = resolve(cwd);
  log.banner('devsetgo readme');

  // Load config
  const config = await loadConfig(absRoot, {
    config: options.config,
    format: options.format,
  });

  // Override CRO setting if specified
  if (options.cro === false) {
    config.readme.cro_enabled = false;
  }

  // Parse project
  log.info('Parsing project sources...');
  const manifest = await parseProject(absRoot, config);

  // Generate README
  log.info('Generating README...');
  const result = await generateReadme(absRoot, manifest, config, { force: options.force });

  log.success(`README generated: ${result.outputPath}`);
  log.info(`Sections included: ${result.sections.join(', ')}`);
}
