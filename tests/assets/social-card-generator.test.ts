/**
 * devsetgo — Social Card Generator Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateSocialCards } from '../../src/assets/social-card-generator.js';
import type { DevSetGoConfig, ProjectManifest } from '../../src/parser/types.js';
import { resolve, join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const testConfig: DevSetGoConfig = {
  project: {
    name: 'test-tool',
    description: 'An amazing developer tool',
    repo: 'https://github.com/test-org/test-tool',
    version: '1.0.0',
  },
  playground: {
    theme: 'dark',
    title: 'Test Playground',
    languages: ['javascript'],
    output_dir: '.devsetgo/playground',
  },
  readme: {
    cro_enabled: true,
    output: 'README.md',
    format: 'github',
    hero: { tagline: 'Makes everything faster', badges: [] },
    problem: 'Dev tools are slow',
    solution: 'We speed things up',
    quick_start: { install_command: 'npm i test-tool', first_run: 'test-tool init' },
    features: [
      { name: 'Fast', description: '10x speed boost', status: 'stable' },
    ],
    metrics: [
      { label: 'Speed', value: '10x' },
    ],
  },
  cta: {
    install: { command: 'npm i test-tool', label: 'Get Started' },
    enterprise: { enabled: true, url: 'https://example.com/demo', label: 'Book Demo', description: 'Enterprise support' },
  },
  assets: {
    output_dir: '.devsetgo-test-assets',
    diagrams: { enabled: false, format: 'mermaid', auto_detect: false },
    social_cards: {
      enabled: true,
      theme: 'dark',
      sizes: [
        { name: 'og', width: 1200, height: 630 },
        { name: 'twitter', width: 1200, height: 675 },
      ],
    },
  },
};

const testManifest: ProjectManifest = {
  project: testConfig.project,
  codeSnippets: [
    {
      id: 'test_fn',
      title: 'Example',
      description: 'An example',
      code: 'console.log("hi")',
      language: 'javascript',
      sourceFile: 'src/index.js',
      lineRange: { start: 1, end: 1 },
      runnable: true,
    },
  ],
  apiEndpoints: [
    {
      method: 'GET',
      path: '/users',
      summary: 'List users',
      description: '',
      tags: ['users'],
      parameters: [],
      responses: {},
    },
  ],
  docSections: [],
  modules: [],
  dependencies: [],
};

// Generated files go to a throwaway directory so a failed run can
// never leave artifacts in the working tree.
let workDir: string;

describe('Social Card Generator', () => {
  // Cleanup after all tests
  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'devsetgo-cards-'));
  });

  afterAll(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('should generate SVG files for configured sizes', async () => {
    const files = await generateSocialCards(workDir, testManifest, testConfig);

    const svgFiles = files.filter(f => f.type === 'svg');
    expect(svgFiles.length).toBe(2); // og + twitter
  });

  it('should return GeneratedFile objects with correct types', async () => {
    const files = await generateSocialCards(workDir, testManifest, testConfig);

    for (const file of files) {
      expect(file.path).toBeDefined();
      expect(file.size).toBeGreaterThan(0);
      expect(['svg', 'png']).toContain(file.type);
    }
  });

  it('should include the project name in generated SVG content', async () => {
    const { readFileSync } = await import('node:fs');
    const files = await generateSocialCards(workDir, testManifest, testConfig);

    const ogSvg = files.find(f => f.path.includes('og') && f.type === 'svg');
    expect(ogSvg).toBeDefined();

    const svgPath = resolve(workDir, ogSvg!.path);
    const content = readFileSync(svgPath, 'utf-8');
    expect(content).toContain('test-tool');
  });

  it('should include metrics in the SVG', async () => {
    const { readFileSync } = await import('node:fs');
    const files = await generateSocialCards(workDir, testManifest, testConfig);

    const ogSvg = files.find(f => f.path.includes('og') && f.type === 'svg');
    const svgPath = resolve(workDir, ogSvg!.path);
    const content = readFileSync(svgPath, 'utf-8');
    expect(content).toContain('10x'); // from metrics
  });

  it('should produce valid SVG markup', async () => {
    const { readFileSync } = await import('node:fs');
    const files = await generateSocialCards(workDir, testManifest, testConfig);

    const svgFiles = files.filter(f => f.type === 'svg');
    for (const file of svgFiles) {
      const svgPath = resolve(workDir, file.path);
      const content = readFileSync(svgPath, 'utf-8');
      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
      expect(content).toContain('xmlns=');
    }
  });
});
