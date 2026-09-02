/**
 * devsetgo — Build Command
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
  force?: boolean;
}

/** A stage that failed, recorded so every stage still gets a chance to run. */
interface StageFailure {
  stage: string;
  error: unknown;
}

export async function buildCommand(cwd: string, options: BuildOptions): Promise<void> {
  const absRoot = resolve(cwd);
  const startTime = Date.now();
  const failures: StageFailure[] = [];

  log.banner('devsetgo build');

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
      const readmeResult = await generateReadme(absRoot, manifest, config, {
        force: options.force,
      });
      log.success(
        `README generated: ${readmeResult.outputPath} (${readmeResult.sections.length} sections)`,
      );
    } catch (err) {
      log.error(`README generation failed: ${err instanceof Error ? err.message : String(err)}`);
      failures.push({ stage: 'readme', error: err });
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
      log.error(
        `Playground generation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      failures.push({ stage: 'playground', error: err });
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
      log.error(`Asset generation failed: ${err instanceof Error ? err.message : String(err)}`);
      failures.push({ stage: 'assets', error: err });
    }
  } else {
    log.step(5, 5, 'Skipping asset generation');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Every stage runs even when an earlier one fails, but a failed stage must
  // still fail the command — otherwise CI reads a broken build as green.
  if (failures.length > 0) {
    log.section('Build Failed');
    for (const { stage, error } of failures) {
      log.error(`${stage}: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw new Error(
      `Build failed after ${elapsed}s — ${failures.length} of 3 stages did not complete ` +
        `(${failures.map((f) => f.stage).join(', ')}).`,
    );
  }

  log.section('Build Complete');
  log.success(`Finished in ${elapsed}s`);
}
