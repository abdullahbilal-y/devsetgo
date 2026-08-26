/**
 * devplay — Badge Generator
 *
 * Generates shields.io badge URLs and custom branded badges.
 */

import type { BadgeConfig, DevPlayConfig } from '../parser/types.js';

/** Base shields.io URL */
const SHIELDS_BASE = 'https://img.shields.io';

/** Badge color palette */
const BADGE_COLORS: Record<string, string> = {
  green: '2ea043',
  blue: '0969da',
  purple: '8957e5',
  orange: 'e3b341',
  red: 'da3633',
  cyan: '00bcd4',
  teal: '009688',
  pink: 'e91e63',
  indigo: '6366f1',
  brand: '7c3aed',
};

/**
 * Generate a shields.io badge URL.
 */
function shieldsBadge(
  label: string,
  message: string,
  color: string,
  options?: { logo?: string; logoColor?: string; style?: string },
): string {
  const style = options?.style || 'for-the-badge';
  let url = `${SHIELDS_BASE}/badge/${encodeURIComponent(label)}-${encodeURIComponent(message)}-${color}?style=${style}`;

  if (options?.logo) {
    url += `&logo=${encodeURIComponent(options.logo)}`;
  }
  if (options?.logoColor) {
    url += `&logoColor=${encodeURIComponent(options.logoColor)}`;
  }

  return url;
}

/**
 * Generate the badge strip for the hero section.
 */
export function generateBadgeStrip(config: DevPlayConfig): string {
  const badges: string[] = [];
  const { project, readme } = config;

  for (const badge of readme.hero.badges) {
    const md = generateBadge(badge, project.repo, project.name);
    if (md) badges.push(md);
  }

  // Always add the playground badge if we have one
  badges.push(
    `[![Interactive Playground](${shieldsBadge('▶ ', 'Live Playground', BADGE_COLORS.brand, { style: 'for-the-badge' })})](${project.repo}#-interactive-playground)`,
  );

  return badges.join('\n');
}

/**
 * Generate a single badge as Markdown.
 */
export function generateBadge(
  badge: BadgeConfig,
  repoUrl: string,
  packageName: string,
): string | null {
  // Extract GitHub org/repo from URL
  const ghMatch = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  const ghRepo = ghMatch?.[1] || '';

  switch (badge.type) {
    case 'build': {
      const status = badge.status || 'passing';
      const color = status === 'passing' ? BADGE_COLORS.green : BADGE_COLORS.red;
      const url = ghRepo
        ? `${SHIELDS_BASE}/github/actions/workflow/status/${ghRepo}/ci.yml?style=for-the-badge&label=build`
        : shieldsBadge('build', status, color);
      return `![Build Status](${url})`;
    }

    case 'version': {
      const url = `${SHIELDS_BASE}/npm/v/${packageName}?style=for-the-badge&color=${BADGE_COLORS.blue}`;
      return `[![npm version](${url})](https://www.npmjs.com/package/${packageName})`;
    }

    case 'license': {
      const url = ghRepo
        ? `${SHIELDS_BASE}/github/license/${ghRepo}?style=for-the-badge&color=${BADGE_COLORS.teal}`
        : shieldsBadge('license', 'MIT', BADGE_COLORS.teal);
      return `![License](${url})`;
    }

    case 'downloads': {
      const url = `${SHIELDS_BASE}/npm/dm/${packageName}?style=for-the-badge&color=${BADGE_COLORS.purple}`;
      return `[![Downloads](${url})](https://www.npmjs.com/package/${packageName})`;
    }

    case 'custom': {
      const label = badge.label || 'badge';
      const status = badge.status || '';
      const color = badge.color || BADGE_COLORS.blue;
      const url = shieldsBadge(label, status, color);
      return badge.url
        ? `[![${label}](${url})](${badge.url})`
        : `![${label}](${url})`;
    }

    default:
      return null;
  }
}

/**
 * Generate a tech-stack badge row.
 */
export function generateTechStackBadges(dependencies: string[]): string {
  const techBadges: Record<string, { logo: string; color: string }> = {
    typescript: { logo: 'typescript', color: '3178c6' },
    react: { logo: 'react', color: '61dafb' },
    'next': { logo: 'nextdotjs', color: '000000' },
    vue: { logo: 'vuedotjs', color: '4fc08d' },
    node: { logo: 'nodedotjs', color: '339933' },
    express: { logo: 'express', color: '000000' },
    rust: { logo: 'rust', color: 'dea584' },
    go: { logo: 'go', color: '00add8' },
    python: { logo: 'python', color: '3776ab' },
    docker: { logo: 'docker', color: '2496ed' },
    postgresql: { logo: 'postgresql', color: '4169e1' },
    mongodb: { logo: 'mongodb', color: '47a248' },
    redis: { logo: 'redis', color: 'dc382d' },
    graphql: { logo: 'graphql', color: 'e10098' },
    webassembly: { logo: 'webassembly', color: '654ff0' },
  };

  const badges: string[] = [];

  for (const dep of dependencies) {
    const key = Object.keys(techBadges).find(k =>
      dep.toLowerCase().includes(k),
    );
    if (key) {
      const { logo, color } = techBadges[key];
      badges.push(
        `![${key}](${shieldsBadge(key, '', color, { logo, logoColor: 'white', style: 'flat-square' })})`,
      );
    }
  }

  return badges.join(' ');
}

export default generateBadgeStrip;
