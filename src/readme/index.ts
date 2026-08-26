/**
 * devsetgo — README Generator
 *
 * Orchestrates README generation with the CRO framework.
 */

import { resolve, join } from 'node:path';
import { createLogger } from '../utils/logger.js';
import { safeWriteFile } from '../utils/file-system.js';
import { generateCROReadme } from './cro-framework.js';
import type { ProjectManifest, DevSetGoConfig, ReadmeResult } from '../parser/types.js';

const logger = createLogger('readme');

/**
 * Generate a CRO-optimized README.
 */
export async function generateReadme(
  rootDir: string,
  manifest: ProjectManifest,
  config: DevSetGoConfig,
): Promise<ReadmeResult> {
  const absRoot = resolve(rootDir);
  const outputPath = join(absRoot, config.readme.output);

  logger.info(`Generating README at ${config.readme.output}`);

  let content: string;
  let sections: string[];

  if (config.readme.cro_enabled) {
    // Full CRO framework
    const result = generateCROReadme(manifest, config);
    content = result.content;
    sections = result.sections;
  } else {
    // Simple README without CRO
    content = generateSimpleReadme(manifest, config);
    sections = ['header', 'quick-start', 'license'];
  }

  // Write the file
  await safeWriteFile(outputPath, content, { overwrite: true });

  logger.success(`README generated with ${sections.length} sections`);

  return {
    outputPath,
    content,
    sections,
  };
}

/**
 * Generate a simple README without CRO framework.
 */
function generateSimpleReadme(manifest: ProjectManifest, config: DevSetGoConfig): string {
  return `# ${config.project.name}

${config.project.description}

## Quick Start

\`\`\`bash
${config.readme.quick_start.install_command}
${config.readme.quick_start.first_run}
\`\`\`

## License

MIT
`;
}

export default generateReadme;
