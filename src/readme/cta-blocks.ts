/**
 * devsetgo — CTA Block Generator
 *
 * Generates dual-friction call-to-action blocks for README files.
 * Developer path (install command) + Enterprise path (consultation booking).
 */

import type { CTAConfig } from '../parser/types.js';

/**
 * Generate a dual CTA block as GitHub-compatible Markdown.
 * Uses HTML tables for side-by-side layout on GitHub.
 */
export function generateDualCTA(cta: CTAConfig): string {
  const installCTA = generateInstallCTA(cta.install);
  const enterpriseCTA = cta.enterprise.enabled ? generateEnterpriseCTA(cta.enterprise) : '';

  if (!cta.enterprise.enabled) {
    return `
---

<div align="center">

${installCTA}

</div>

---
`;
  }

  return `
---

<div align="center">

## 🚀 Get Started

<table>
<tr>
<td align="center" width="50%">

### 👩‍💻 Developer Quick Start

${installCTA}

</td>
<td align="center" width="50%">

### 🏢 Enterprise & Teams

${enterpriseCTA}

</td>
</tr>
</table>

</div>

---
`;
}

/**
 * Generate the developer installation CTA.
 */
export function generateInstallCTA(install: CTAConfig['install']): string {
  return `
**${install.label}**

\`\`\`bash
${install.command}
\`\`\`

<sub>Works on macOS, Linux, and Windows. Requires Node.js 20+.</sub>
`;
}

/**
 * Generate the enterprise consultation CTA.
 */
export function generateEnterpriseCTA(enterprise: CTAConfig['enterprise']): string {
  return `
**${enterprise.label}**

${enterprise.description}

<br/>

<a href="${enterprise.url}">
  <img src="https://img.shields.io/badge/📅_Schedule_a_Call-7c3aed?style=for-the-badge&logoColor=white" alt="Schedule a Call" />
</a>

<br/>
<sub>Custom integrations • SLA support • Dedicated onboarding</sub>
`;
}

/**
 * Generate an inline CTA (smaller, for embedding within content sections).
 */
export function generateInlineCTA(command: string, url?: string): string {
  let md = `\n> **Ready to try it?** Run \`${command}\` to get started.`;
  if (url) {
    md += `\n> Or [schedule a call](${url}) for enterprise support.`;
  }
  return md + '\n';
}

export default generateDualCTA;
