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
 *
 * Optional renderers (sharp for PNG, mermaid-cli for SVG) degrade to a warning
 * inside the individual generators — always-present outputs (SVG cards, .mermaid
 * sources) are mandatory, so a failure here propagates and fails the build.
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

  if (config.assets.diagrams.enabled) {
    diagrams = await generateDiagrams(absRoot, manifest, config);
    logger.success(`Generated ${diagrams.length} diagram files`);
  }

  if (config.assets.social_cards.enabled) {
    socialCards = await generateSocialCards(absRoot, manifest, config);
    logger.success(`Generated ${socialCards.length} social card files`);
  }

  return { diagrams, socialCards };
}

export default generateAssets;
