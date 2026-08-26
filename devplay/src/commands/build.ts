/**
 * devplay — Build Command
 *
 * Orchestrates the full pipeline: parse → playground + README + assets.
 */

import { resolve } from 'node:path';
import { log } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';
import { parseProject } from '../parser/index.js';
import { generateReadme } from '../readme/index.js';
import { generatePlayground } from '../playground/index.js';
import { generateAssets } from '../assets/index.js';
import { formatBytes } from '../utils/file-system.js';

interface BuildOptions {
  config?: string;
  output?: string;
  verbose?: boolean;
  skipPlayground?: boolean;
  skipReadme?: boolean;
  skipAssets?: boolean;
}

export async function buildCommand(cwd: string, options: BuildOptions): Promise<void> {
  const absRoot = resolve(cwd);
  const startTime = Date.now();

  log.banner('devplay build');

  // 1. Load configuration
  log.step(1, 5, 'Loading configuration...');
  const config = await loadConfig(absRoot, {
    config: options.config,
    output: options.output,
  });
  log.success(`Project: ${config.project.name}`);

  // 2. Parse project
  log.step(2, 5, 'Parsing project sources...');
  const manifest = await parseProject(absRoot, config);

  log.info(
    `Parsed: ${manifest.codeSnippets.length} snippets, ` +
    `${manifest.apiEndpoints.length} endpoints, ` +
    `${manifest.docSections.length} doc sections`,
  );

  // 3. Generate README
  if (!options.skipReadme) {
    log.step(3, 5, 'Generating CRO-optimized README...');
    try {
      const readmeResult = await generateReadme(absRoot, manifest, config);
      log.success(`README generated: ${readmeResult.outputPath} (${readmeResult.sections.length} sections)`);
    } catch (err) {
      log.error(`README generation failed: ${err}`);
    }
  } else {
    log.step(3, 5, 'Skipping README generation');
  }

  // 4. Generate Playground
  if (!options.skipPlayground) {
    log.step(4, 5, 'Building interactive playground...');
    try {
      const playgroundResult = await generatePlayground(absRoot, manifest, config);
      log.success(
        `Playground built: ${playgroundResult.files.length} files (${formatBytes(playgroundResult.totalSize)})`,
      );
    } catch (err) {
      log.error(`Playground generation failed: ${err}`);
    }
  } else {
    log.step(4, 5, 'Skipping playground generation');
  }

  // 5. Generate Assets
  if (!options.skipAssets) {
    log.step(5, 5, 'Generating visual assets...');
    try {
      const assetResult = await generateAssets(absRoot, manifest, config);
      log.success(
        `Assets generated: ${assetResult.diagrams.length} diagrams, ${assetResult.socialCards.length} social cards`,
      );
    } catch (err) {
      log.error(`Asset generation failed: ${err}`);
    }
  } else {
    log.step(5, 5, 'Skipping asset generation');
  }

  // Done
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log.section('Build Complete');
  log.success(`Finished in ${elapsed}s`);
}
