/**
 * devplay — Playground Generator
 *
 * Orchestrates playground generation: compiles snippets,
 * renders templates, and writes the static site output.
 */

import { resolve, join } from 'node:path';
import { createLogger } from '../utils/logger.js';
import { ensureDir, safeWriteFile, getFileSize } from '../utils/file-system.js';
import { prepareSnippetsForExecution } from './wasm-compiler.js';
import { renderPlaygroundHTML } from './template-engine.js';
import { PLAYGROUND_CSS } from './styles.js';
import { PLAYGROUND_JS } from './runtime.js';
import type { ProjectManifest, DevPlayConfig, PlaygroundResult, GeneratedFile } from '../parser/types.js';

const logger = createLogger('playground');

/**
 * Generate the interactive playground static site.
 */
export async function generatePlayground(
  rootDir: string,
  manifest: ProjectManifest,
  config: DevPlayConfig,
): Promise<PlaygroundResult> {
  const absRoot = resolve(rootDir);
  const outputDir = resolve(absRoot, config.playground.output_dir);

  logger.info(`Generating playground at ${config.playground.output_dir}`);

  // 1. Ensure output directory exists
  await ensureDir(outputDir);

  // 2. Prepare code snippets for WASM execution
  const compiledSnippets = prepareSnippetsForExecution(manifest.codeSnippets);
  logger.info(`Prepared ${compiledSnippets.length} executable snippets`);

  // If no snippets found, create a welcome example
  if (compiledSnippets.length === 0) {
    compiledSnippets.push({
      id: 'welcome_example',
      title: 'Welcome Example',
      description: 'A simple example to get started.',
      code: `// Welcome to ${config.project.name} Playground!
// Edit this code and click "▶ Run" (or press Ctrl+Enter)

function greet(name) {
  return \`Hello, \${name}! 🚀\`;
}

console.log(greet("Developer"));
console.log("Try editing this code!");

// Quick math
const fibonacci = n => n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);
console.log("Fibonacci(10) =", fibonacci(10));`,
      language: 'javascript',
      category: 'getting-started',
      runnable: true,
    });
  }

  // 3. Render the HTML page
  const html = renderPlaygroundHTML(
    manifest,
    config,
    compiledSnippets,
    PLAYGROUND_CSS,
    PLAYGROUND_JS,
  );

  // 4. Write output files
  const files: GeneratedFile[] = [];

  // Main HTML file
  const htmlPath = join(outputDir, 'index.html');
  await safeWriteFile(htmlPath, html, { overwrite: true });
  files.push({
    path: 'index.html',
    size: Buffer.byteLength(html, 'utf-8'),
    type: 'html',
  });

  // Snippets data as separate JSON (for larger projects)
  const snippetsJson = JSON.stringify(compiledSnippets, null, 2);
  const snippetsPath = join(outputDir, 'snippets.json');
  await safeWriteFile(snippetsPath, snippetsJson, { overwrite: true });
  files.push({
    path: 'snippets.json',
    size: Buffer.byteLength(snippetsJson, 'utf-8'),
    type: 'json',
  });

  // Calculate total size
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  logger.success(`Playground generated: ${files.length} files`);

  return {
    outputDir,
    files,
    totalSize,
  };
}

export default generatePlayground;
