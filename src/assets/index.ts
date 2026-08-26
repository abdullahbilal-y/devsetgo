/**
 * devsetgo — Asset Generator
 *
 * Orchestrates diagram and social card generation.
 */

import { resolve } from 'node:path';
import { createLogger } from '../utils/logger.js';
import { generateDiagrams } from './diagram-generator.js';
import { generateSocialCards } from './social-card-generator.js';
import type { ProjectManifest, DevSetGoConfig, AssetResult } from '../parser/types.js';

const logger = createLogger('assets');

/**
 * Generate all visual assets (diagrams + social cards).
 */
export async function generateAssets(
  rootDir: string,
  manifest: ProjectManifest,
  config: DevSetGoConfig,
): Promise<AssetResult> {
  const absRoot = resolve(rootDir);

  logger.info('Generating visual assets...');

  let diagrams: AssetResult['diagrams'] = [];
  let socialCards: AssetResult['socialCards'] = [];

  // Generate diagrams
  if (config.assets.diagrams.enabled) {
    try {
      diagrams = await generateDiagrams(absRoot, manifest, config);
      logger.success(`Generated ${diagrams.length} diagram files`);
    } catch (err) {
      logger.error(`Diagram generation failed: ${err}`);
    }
  }

  // Generate social cards
  if (config.assets.social_cards.enabled) {
    try {
      socialCards = await generateSocialCards(absRoot, manifest, config);
      logger.success(`Generated ${socialCards.length} social card files`);
    } catch (err) {
      logger.error(`Social card generation failed: ${err}`);
    }
  }

  return { diagrams, socialCards };
}

export default generateAssets;
