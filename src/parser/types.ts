/**
 * devsetgo — Shared Type Definitions
 *
 * Core interfaces used across all parser, generator, and CLI modules.
 */

// ── Configuration Types ──────────────────────────────────────────────

export interface DevSetGoConfig {
  project: ProjectConfig;
  playground: PlaygroundConfig;
  readme: ReadmeConfig;
  cta: CTAConfig;
  assets: AssetsConfig;
}

export interface ProjectConfig {
  name: string;
  description: string;
  repo: string;
  website?: string;
  version?: string;
}

export interface PlaygroundConfig {
  theme: 'dark' | 'light' | 'auto';
  title: string;
  languages: string[];
  api_base_url?: string;
  output_dir: string;
}

export interface ReadmeConfig {
  cro_enabled: boolean;
  output: string;
  format: 'github' | 'gitlab';
  hero: HeroConfig;
  problem: string;
  solution: string;
  quick_start: QuickStartConfig;
  features: FeatureConfig[];
  metrics: MetricConfig[];
}

export interface HeroConfig {
  tagline: string;
  badges: BadgeConfig[];
}

export interface BadgeConfig {
  type: 'build' | 'version' | 'license' | 'downloads' | 'custom';
  status?: string;
  label?: string;
  color?: string;
  url?: string;
}

export interface QuickStartConfig {
  install_command: string;
  first_run: string;
}

export interface FeatureConfig {
  name: string;
  description: string;
  status: 'stable' | 'beta' | 'alpha' | 'coming-soon';
}

export interface MetricConfig {
  label: string;
  value: string;
}

export interface CTAConfig {
  install: {
    command: string;
    label: string;
  };
  enterprise: {
    enabled: boolean;
    url: string;
    label: string;
    description: string;
  };
}

export interface AssetsConfig {
  output_dir: string;
  diagrams: {
    enabled: boolean;
    format: 'mermaid' | 'svg' | 'png' | 'all';
    auto_detect: boolean;
  };
  social_cards: {
    enabled: boolean;
    theme: 'dark' | 'light';
    sizes: SocialCardSize[];
  };
}

export interface SocialCardSize {
  name: string;
  width: number;
  height: number;
}

// ── Parser Output Types ──────────────────────────────────────────────

/**
 * The unified output of all parsers — represents the entire analyzed project.
 */
export interface ProjectManifest {
  /** Project metadata from config or auto-detection */
  project: ProjectConfig;
  /** Extracted executable code snippets */
  codeSnippets: CodeSnippet[];
  /** Parsed API endpoints from OpenAPI schemas */
  apiEndpoints: APIEndpoint[];
  /** Parsed documentation sections from Markdown files */
  docSections: DocSection[];
  /** Detected modules/packages in the codebase */
  modules: ModuleInfo[];
  /** Detected dependencies */
  dependencies: DependencyInfo[];
}

/**
 * An executable code snippet extracted from source files.
 */
export interface CodeSnippet {
  /** Unique identifier for the snippet */
  id: string;
  /** Display title (from annotation or function name) */
  title: string;
  /** Description (from JSDoc/docstring) */
  description: string;
  /** The actual code content */
  code: string;
  /** Programming language */
  language: string;
  /** Source file path (relative to project root) */
  sourceFile: string;
  /** Line number range in source file */
  lineRange: { start: number; end: number };
  /** Whether this snippet is marked as runnable */
  runnable: boolean;
  /** Expected output (if annotated) */
  expectedOutput?: string;
  /** Dependencies required to run this snippet */
  dependencies?: string[];
  /** Category/group for organizing in the playground */
  category?: string;
}

/**
 * An API endpoint extracted from an OpenAPI schema.
 */
export interface APIEndpoint {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string;
  /** URL path (e.g., /api/users/{id}) */
  path: string;
  /** Human-readable summary */
  summary: string;
  /** Detailed description */
  description: string;
  /** Endpoint tag/group */
  tags: string[];
  /** Request parameters */
  parameters: APIParameter[];
  /** Request body schema */
  requestBody?: APIRequestBody;
  /** Response schemas by status code */
  responses: Record<string, APIResponse>;
  /** Required authentication */
  auth?: APIAuth;
}

export interface APIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean;
  description: string;
  schema: Record<string, unknown>;
  example?: unknown;
}

export interface APIRequestBody {
  description: string;
  required: boolean;
  contentType: string;
  schema: Record<string, unknown>;
  example?: unknown;
}

export interface APIResponse {
  description: string;
  contentType?: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

export interface APIAuth {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  name?: string;
  in?: string;
}

/**
 * A section of documentation parsed from a Markdown file.
 */
export interface DocSection {
  /** Section heading */
  title: string;
  /** Heading level (1-6) */
  level: number;
  /** Raw Markdown content of the section */
  content: string;
  /** Fenced code blocks within this section */
  codeBlocks: DocCodeBlock[];
  /** Source file path */
  sourceFile: string;
}

export interface DocCodeBlock {
  /** Language annotation from the fenced block */
  language: string;
  /** Code content */
  code: string;
  /** Whether this looks executable (has a main function, imports, etc.) */
  isExecutable: boolean;
}

/**
 * A detected module/package in the codebase.
 */
export interface ModuleInfo {
  /** Module name */
  name: string;
  /** Module path (relative to project root) */
  path: string;
  /** Exported symbols */
  exports: string[];
  /** Dependencies on other modules */
  internalDependencies: string[];
  /** Description (from package.json or doc comment) */
  description?: string;
}

/**
 * A detected dependency (npm package, crate, etc.)
 */
export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development';
}

// ── Generator Output Types ───────────────────────────────────────────

/**
 * Result of a playground generation run.
 */
export interface PlaygroundResult {
  /** Path to the generated output directory */
  outputDir: string;
  /** List of generated files */
  files: GeneratedFile[];
  /** Total size in bytes */
  totalSize: number;
}

/**
 * Result of a README generation run.
 */
export interface ReadmeResult {
  /** Path to the generated README file */
  outputPath: string;
  /** The generated Markdown content */
  content: string;
  /** Sections included in the README */
  sections: string[];
}

/**
 * Result of an asset generation run.
 */
export interface AssetResult {
  /** Generated diagram files */
  diagrams: GeneratedFile[];
  /** Generated social card files */
  socialCards: GeneratedFile[];
}

export interface GeneratedFile {
  /** Output path (relative to project root) */
  path: string;
  /** File size in bytes */
  size: number;
  /** File type */
  type: 'html' | 'css' | 'js' | 'wasm' | 'svg' | 'png' | 'md' | 'mermaid' | 'json';
}
