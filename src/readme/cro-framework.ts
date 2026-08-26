/**
 * devsetgo — CRO Framework
 *
 * Conversion Rate Optimization framework that structures README content
 * into a 10-section format proven to convert developer visits into adoption.
 */

import type { DevSetGoConfig, ProjectManifest, FeatureConfig, MetricConfig } from '../parser/types.js';
import { generateBadgeStrip, generateTechStackBadges } from './badge-generator.js';
import { generateDualCTA } from './cta-blocks.js';

/**
 * Section names in the CRO framework (in order).
 */
export const CRO_SECTIONS = [
  'hero',
  'problem',
  'solution',
  'architecture',
  'quick-start',
  'interactive-demo',
  'features',
  'metrics',
  'cta',
  'comparison',
  'contributing',
] as const;

export type CROSection = typeof CRO_SECTIONS[number];

/**
 * Generate the full CRO-optimized README content.
 */
export function generateCROReadme(
  manifest: ProjectManifest,
  config: DevSetGoConfig,
): { content: string; sections: string[] } {
  const sections: string[] = [];
  const parts: string[] = [];

  // 1. Hero Section
  parts.push(generateHeroSection(config));
  sections.push('hero');

  // 2. Problem Statement
  if (config.readme.problem) {
    parts.push(generateProblemSection(config.readme.problem));
    sections.push('problem');
  }

  // 3. Solution Overview
  if (config.readme.solution) {
    parts.push(generateSolutionSection(config.readme.solution, config.readme.metrics));
    sections.push('solution');
  }

  // 4. Architecture Diagram
  if (manifest.modules.length > 0) {
    parts.push(generateArchitectureSection(manifest));
    sections.push('architecture');
  }

  // 5. Quick Start
  parts.push(generateQuickStartSection(config));
  sections.push('quick-start');

  // 6. Interactive Demo
  if (manifest.codeSnippets.some(s => s.runnable) || manifest.apiEndpoints.length > 0) {
    parts.push(generateInteractiveDemoSection(config));
    sections.push('interactive-demo');
  }

  // 7. Feature Matrix
  if (config.readme.features.length > 0) {
    parts.push(generateFeatureSection(config.readme.features));
    sections.push('features');
  }

  // 8. Performance Metrics
  if (config.readme.metrics.length > 0) {
    parts.push(generateMetricsSection(config.readme.metrics));
    sections.push('metrics');
  }

  // 9. Dual CTA Block
  parts.push(generateDualCTA(config.cta));
  sections.push('cta');

  // 10. Contributing & License
  parts.push(generateContributingSection(config));
  sections.push('contributing');

  // Tech stack badges at bottom
  if (manifest.dependencies.length > 0) {
    const techBadges = generateTechStackBadges(
      manifest.dependencies.map(d => d.name),
    );
    if (techBadges) {
      parts.push(`\n<div align="center">\n\n### Built With\n\n${techBadges}\n\n</div>\n`);
    }
  }

  return {
    content: parts.join('\n'),
    sections,
  };
}

// ── Section Generators ───────────────────────────────────────────────

function generateHeroSection(config: DevSetGoConfig): string {
  const { project, readme } = config;
  const badges = generateBadgeStrip(config);

  return `<div align="center">

# ${project.name}

### ${readme.hero.tagline}

${badges}

<br/>

${project.description}

</div>

`;
}

function generateProblemSection(problem: string): string {
  return `## 😤 The Problem

${problem}

`;
}

function generateSolutionSection(solution: string, metrics: MetricConfig[]): string {
  let md = `## ✨ The Solution

${solution}

`;

  if (metrics.length > 0) {
    md += '<div align="center">\n\n';
    md += '<table>\n<tr>\n';
    for (const metric of metrics) {
      md += `<td align="center"><h3>${metric.value}</h3><sub>${metric.label}</sub></td>\n`;
    }
    md += '</tr>\n</table>\n\n';
    md += '</div>\n\n';
  }

  return md;
}

function generateArchitectureSection(manifest: ProjectManifest): string {
  // Auto-generate a Mermaid diagram from detected modules
  let mermaid = '```mermaid\ngraph TB\n';

  for (const mod of manifest.modules) {
    const id = mod.name.replace(/[^a-zA-Z0-9]/g, '_');
    const exports = mod.exports.length > 0
      ? `<br/><sub>${mod.exports.slice(0, 3).join(', ')}${mod.exports.length > 3 ? '...' : ''}</sub>`
      : '';
    mermaid += `    ${id}["${mod.name}${exports}"]\n`;
  }

  // Add dependency arrows
  for (const mod of manifest.modules) {
    const fromId = mod.name.replace(/[^a-zA-Z0-9]/g, '_');
    for (const dep of mod.internalDependencies) {
      const toId = dep.replace(/[^a-zA-Z0-9]/g, '_');
      mermaid += `    ${fromId} --> ${toId}\n`;
    }
  }

  mermaid += '```\n';

  return `## 🏗️ Architecture

${mermaid}

`;
}

function generateQuickStartSection(config: DevSetGoConfig): string {
  const { quick_start } = config.readme;

  return `## ⚡ Quick Start

Get up and running in under 30 seconds:

\`\`\`bash
# Install
${quick_start.install_command}

# Run
${quick_start.first_run}
\`\`\`

`;
}

function generateInteractiveDemoSection(config: DevSetGoConfig): string {
  return `## 🎮 Interactive Playground

Try ${config.project.name} directly in your browser — no installation required:

<div align="center">

**[▶ Launch Interactive Playground](${config.project.repo}#playground)**

<sub>Runs entirely in your browser via WebAssembly. No data leaves your machine.</sub>

</div>

`;
}

function generateFeatureSection(features: FeatureConfig[]): string {
  const statusIcons: Record<string, string> = {
    stable: '✅',
    beta: '🧪',
    alpha: '⚠️',
    'coming-soon': '🔜',
  };

  let md = `## 📋 Features

| Feature | Status | Description |
|---------|--------|-------------|
`;

  for (const feature of features) {
    const icon = statusIcons[feature.status] || '❓';
    md += `| **${feature.name}** | ${icon} ${feature.status} | ${feature.description} |\n`;
  }

  md += '\n';
  return md;
}

function generateMetricsSection(metrics: MetricConfig[]): string {
  let md = `## 📊 Performance

<div align="center">

| Metric | Value |
|--------|-------|
`;

  for (const metric of metrics) {
    md += `| ${metric.label} | **${metric.value}** |\n`;
  }

  md += '\n</div>\n\n';
  return md;
}

function generateContributingSection(config: DevSetGoConfig): string {
  return `## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by the [${config.project.name}](${config.project.repo}) team**

</div>
`;
}

export default generateCROReadme;
