/**
 * devplay — Assets Command
 *
 * Standalone asset generation for diagrams and social cards.
 */

import { resolve } from 'node:path';
import { log } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';
import { parseProject } from '../parser/index.js';
import { generateAssets } from '../assets/index.js';

interface AssetsOptions {
  config?: string;
  output?: string;
  verbose?: boolean;
  type?: 'diagrams' | 'cards' | 'all';
  theme?: 'dark' | 'light';
}

export async function assetsCommand(cwd: string, options: AssetsOptions): Promise<void> {
  const absRoot = resolve(cwd);
  log.banner('devplay assets');

  // Load config
  const config = await loadConfig(absRoot, {
    config: options.config,
    output: options.output,
  });

  // Override theme if specified
  if (options.theme) {
    config.assets.social_cards.theme = options.theme;
  }

  // Selectively disable based on --type flag
  if (options.type === 'diagrams') {
    config.assets.social_cards.enabled = false;
  } else if (options.type === 'cards') {
    config.assets.diagrams.enabled = false;
  }

  // Parse project
  log.info('Parsing project sources...');
  const manifest = await parseProject(absRoot, config);

  // Generate assets
  log.info('Generating visual assets...');
  const result = await generateAssets(absRoot, manifest, config);

  if (result.diagrams.length > 0) {
    log.success(`Generated ${result.diagrams.length} architecture diagrams`);
  }
  if (result.socialCards.length > 0) {
    log.success(`Generated ${result.socialCards.length} social media cards`);
  }
}
