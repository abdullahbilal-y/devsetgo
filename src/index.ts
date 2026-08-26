/**
 * devsetgo — Public API Entry Point
 *
 * Re-exports core functionality for programmatic usage.
 */

export { parseProject } from './parser/index.js';
export { parseCodeFiles } from './parser/code-parser.js';
export { parseOpenAPIFiles } from './parser/openapi-parser.js';
export { parseMarkdownFiles } from './parser/markdown-parser.js';
export { generateReadme } from './readme/index.js';
export { generatePlayground } from './playground/index.js';
export { generateAssets } from './assets/index.js';
export { loadConfig } from './utils/config.js';

// Re-export types
export type {
  DevSetGoConfig,
  ProjectManifest,
  CodeSnippet,
  APIEndpoint,
  DocSection,
  PlaygroundResult,
  ReadmeResult,
  AssetResult,
} from './parser/types.js';
