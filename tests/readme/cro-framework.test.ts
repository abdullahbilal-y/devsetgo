/**
 * devsetgo — README Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { generateCROReadme } from '../../src/readme/cro-framework.js';
import { generateBadgeStrip, generateTechStackBadges } from '../../src/readme/badge-generator.js';
import { generateDualCTA } from '../../src/readme/cta-blocks.js';
import type { DevSetGoConfig, ProjectManifest } from '../../src/parser/types.js';

// Minimal test config
const testConfig: DevSetGoConfig = {
  project: {
    name: 'test-tool',
    description: 'A test developer tool',
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
    hero: {
      tagline: 'The fastest way to do the thing.',
      badges: [
        { type: 'build', status: 'passing' },
        { type: 'version' },
        { type: 'license' },
      ],
    },
    problem: 'Developers waste hours configuring tools manually.',
    solution: 'Our tool automates everything in one command.',
    quick_start: {
      install_command: 'npm install -g test-tool',
      first_run: 'test-tool init',
    },
    features: [
      { name: 'Auto Config', description: 'Detects your setup automatically', status: 'stable' },
      { name: 'Live Reload', description: 'Changes reflect instantly', status: 'beta' },
    ],
    metrics: [
      { label: 'Build Speed', value: '10x faster' },
      { label: 'Bundle Size', value: '< 20KB' },
    ],
  },
  cta: {
    install: {
      command: 'npm install -g test-tool',
      label: 'Get Started in 30 Seconds',
    },
    enterprise: {
      enabled: true,
      url: 'https://calendly.com/test/demo',
      label: 'Book Enterprise Demo',
      description: 'Custom integration and SLA support.',
    },
  },
  assets: {
    output_dir: 'assets',
    diagrams: { enabled: true, format: 'all', auto_detect: true },
    social_cards: {
      enabled: true,
      theme: 'dark',
      sizes: [{ name: 'og', width: 1200, height: 630 }],
    },
  },
};

const testManifest: ProjectManifest = {
  project: testConfig.project,
  codeSnippets: [
    {
      id: 'test_greet',
      title: 'greet',
      description: 'A greeting function',
      code: 'function greet(name) { return `Hello, ${name}`; }',
      language: 'javascript',
      sourceFile: 'src/index.js',
      lineRange: { start: 1, end: 3 },
      runnable: true,
      category: 'basics',
    },
  ],
  apiEndpoints: [],
  docSections: [],
  modules: [
    { name: 'core', path: 'src/core', exports: ['greet', 'init'], internalDependencies: [] },
    { name: 'utils', path: 'src/utils', exports: ['log'], internalDependencies: [] },
  ],
  dependencies: [
    { name: 'commander', version: '^13.0.0', type: 'production' },
    { name: 'typescript', version: '^5.7.0', type: 'development' },
  ],
};

describe('CRO Framework', () => {
  it('should generate all expected sections', () => {
    const result = generateCROReadme(testManifest, testConfig);

    expect(result.sections).toContain('hero');
    expect(result.sections).toContain('problem');
    expect(result.sections).toContain('solution');
    expect(result.sections).toContain('quick-start');
    expect(result.sections).toContain('features');
    expect(result.sections).toContain('cta');
    expect(result.sections).toContain('contributing');
  });

  it('should include the project name in the hero', () => {
    const result = generateCROReadme(testManifest, testConfig);
    expect(result.content).toContain('test-tool');
  });

  it('should include the problem statement', () => {
    const result = generateCROReadme(testManifest, testConfig);
    expect(result.content).toContain('Developers waste hours');
  });

  it('should include install command in quick start', () => {
    const result = generateCROReadme(testManifest, testConfig);
    expect(result.content).toContain('npm install -g test-tool');
  });

  it('should include feature table', () => {
    const result = generateCROReadme(testManifest, testConfig);
    expect(result.content).toContain('Auto Config');
    expect(result.content).toContain('Live Reload');
    expect(result.content).toContain('stable');
    expect(result.content).toContain('beta');
  });

  it('should include metrics', () => {
    const result = generateCROReadme(testManifest, testConfig);
    expect(result.content).toContain('10x faster');
    expect(result.content).toContain('< 20KB');
  });

  it('should include architecture section with modules', () => {
    const result = generateCROReadme(testManifest, testConfig);
    expect(result.sections).toContain('architecture');
    expect(result.content).toContain('mermaid');
  });
});

describe('Badge Generator', () => {
  it('should generate badge strip with multiple badges', () => {
    const badges = generateBadgeStrip(testConfig);
    expect(badges).toContain('shields.io');
    expect(badges).toContain('Playground');
  });

  it('should generate tech stack badges', () => {
    const badges = generateTechStackBadges(['typescript', 'commander', 'react']);
    expect(badges).toContain('typescript');
  });
});

describe('CTA Blocks', () => {
  it('should generate dual CTA with both paths', () => {
    const cta = generateDualCTA(testConfig.cta);
    expect(cta).toContain('Developer Quick Start');
    expect(cta).toContain('Enterprise');
    expect(cta).toContain('npm install -g test-tool');
    expect(cta).toContain('calendly.com');
  });

  it('should generate install-only CTA when enterprise is disabled', () => {
    const ctaConfig = {
      ...testConfig.cta,
      enterprise: { ...testConfig.cta.enterprise, enabled: false },
    };
    const cta = generateDualCTA(ctaConfig);
    expect(cta).toContain('npm install -g test-tool');
    expect(cta).not.toContain('Enterprise');
  });
});
