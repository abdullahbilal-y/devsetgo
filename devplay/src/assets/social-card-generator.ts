/**
 * devplay — Social Card Generator
 *
 * Generates dark-mode social media cards (OG/Twitter/GitHub) using SVG templates
 * and optional sharp rendering to PNG.
 */

import { join } from 'node:path';
import { createLogger } from '../utils/logger.js';
import { safeWriteFile, ensureDir } from '../utils/file-system.js';
import type { DevPlayConfig, ProjectManifest, GeneratedFile, SocialCardSize } from '../parser/types.js';

const logger = createLogger('social-cards');

/**
 * Generate social media cards for the project.
 */
export async function generateSocialCards(
  rootDir: string,
  manifest: ProjectManifest,
  config: DevPlayConfig,
): Promise<GeneratedFile[]> {
  const outputDir = join(rootDir, config.assets.output_dir, 'social');
  await ensureDir(outputDir);

  const files: GeneratedFile[] = [];
  const isDark = config.assets.social_cards.theme === 'dark';

  for (const size of config.assets.social_cards.sizes) {
    // Generate SVG
    const svg = generateCardSVG(manifest, config, size, isDark);
    const svgPath = join(outputDir, `${size.name}-card.svg`);
    await safeWriteFile(svgPath, svg, { overwrite: true });

    files.push({
      path: `${config.assets.output_dir}/social/${size.name}-card.svg`,
      size: Buffer.byteLength(svg, 'utf-8'),
      type: 'svg',
    });

    // Try to render PNG using sharp
    try {
      const pngFile = await renderSVGtoPNG(svg, outputDir, size);
      if (pngFile) files.push(pngFile);
    } catch (err) {
      logger.debug(`PNG rendering skipped for ${size.name}: ${err}`);
    }
  }

  logger.success(`Generated ${files.length} social cards`);
  return files;
}

/**
 * Generate an SVG social media card.
 */
function generateCardSVG(
  manifest: ProjectManifest,
  config: DevPlayConfig,
  size: SocialCardSize,
  isDark: boolean,
): string {
  const { width, height } = size;
  const { project, readme } = config;

  // Colors
  const bg = isDark ? '#0a0a0f' : '#fafafa';
  const bgSecondary = isDark ? '#12121a' : '#f0f0f5';
  const textPrimary = isDark ? '#e8e8f0' : '#1a1a2e';
  const textSecondary = isDark ? '#9898b0' : '#4a4a68';
  const accent = '#7c3aed';
  const accentLight = '#a78bfa';

  // Compute layout metrics
  const padding = Math.round(width * 0.06);
  const titleSize = Math.round(width * 0.05);
  const subtitleSize = Math.round(width * 0.022);
  const taglineSize = Math.round(width * 0.02);
  const metricSize = Math.round(width * 0.035);
  const metricLabelSize = Math.round(width * 0.014);

  // Metrics display
  const metrics = readme.metrics.slice(0, 3);
  const metricWidth = metrics.length > 0 ? Math.round((width - padding * 2) / metrics.length) : 0;

  // Feature count
  const featureCount = readme.features.length;
  const snippetCount = manifest.codeSnippets.length;
  const endpointCount = manifest.apiEndpoints.length;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg}" />
      <stop offset="100%" style="stop-color:${bgSecondary}" />
    </linearGradient>

    <!-- Accent gradient -->
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accent}" />
      <stop offset="100%" style="stop-color:${accentLight}" />
    </linearGradient>

    <!-- Glow effect -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Subtle noise texture -->
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" mode="multiply" result="noisy"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.05"/>
      </feComponentTransfer>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" rx="0"/>

  <!-- Decorative gradient orbs -->
  <circle cx="${width * 0.8}" cy="${height * 0.2}" r="${width * 0.25}" fill="${accent}" opacity="0.06" filter="url(#glow)"/>
  <circle cx="${width * 0.15}" cy="${height * 0.85}" r="${width * 0.2}" fill="${accentLight}" opacity="0.04" filter="url(#glow)"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="${width}" height="4" fill="url(#accentGrad)"/>

  <!-- Grid pattern (subtle) -->
  <line x1="${padding}" y1="${height * 0.55}" x2="${width - padding}" y2="${height * 0.55}" stroke="${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}" stroke-width="1"/>

  <!-- Logo icon -->
  <rect x="${padding}" y="${padding}" width="${titleSize * 0.9}" height="${titleSize * 0.9}" rx="${titleSize * 0.2}" fill="url(#accentGrad)"/>
  <text x="${padding + titleSize * 0.45}" y="${padding + titleSize * 0.65}" fill="white" font-family="Arial, sans-serif" font-size="${titleSize * 0.5}" font-weight="700" text-anchor="middle">▶</text>

  <!-- Project Name -->
  <text x="${padding + titleSize * 1.1}" y="${padding + titleSize * 0.7}" fill="${textPrimary}" font-family="Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="800" letter-spacing="-1">${escapeXml(project.name)}</text>

  <!-- Tagline -->
  <text x="${padding}" y="${padding + titleSize * 1.6}" fill="${textSecondary}" font-family="Inter, Arial, sans-serif" font-size="${subtitleSize}" font-weight="400">${escapeXml(truncate(readme.hero.tagline, 80))}</text>

  <!-- Description -->
  <text x="${padding}" y="${padding + titleSize * 2.3}" fill="${textSecondary}" font-family="Inter, Arial, sans-serif" font-size="${taglineSize}" font-weight="300" opacity="0.8">${escapeXml(truncate(project.description, 100))}</text>

  <!-- Metrics section -->
  ${metrics.map((m, i) => `
    <g transform="translate(${padding + i * metricWidth}, ${height * 0.58})">
      <text fill="${accentLight}" font-family="Inter, Arial, sans-serif" font-size="${metricSize}" font-weight="800">${escapeXml(m.value)}</text>
      <text y="${metricSize * 1.3}" fill="${textSecondary}" font-family="Inter, Arial, sans-serif" font-size="${metricLabelSize}" font-weight="400">${escapeXml(m.label)}</text>
    </g>
  `).join('')}

  <!-- Stats badges at bottom -->
  <g transform="translate(${padding}, ${height - padding - taglineSize * 1.5})">
    ${featureCount > 0 ? `
      <rect x="0" y="0" width="${taglineSize * 5}" height="${taglineSize * 1.6}" rx="${taglineSize * 0.3}" fill="${isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)'}" stroke="${accent}" stroke-width="0.5"/>
      <text x="${taglineSize * 2.5}" y="${taglineSize * 1.1}" fill="${accentLight}" font-family="Inter, Arial, sans-serif" font-size="${metricLabelSize}" font-weight="600" text-anchor="middle">${featureCount} Features</text>
    ` : ''}
    ${snippetCount > 0 ? `
      <rect x="${taglineSize * 5.5}" y="0" width="${taglineSize * 5}" height="${taglineSize * 1.6}" rx="${taglineSize * 0.3}" fill="${isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)'}" stroke="#22c55e" stroke-width="0.5"/>
      <text x="${taglineSize * 8}" y="${taglineSize * 1.1}" fill="#4ade80" font-family="Inter, Arial, sans-serif" font-size="${metricLabelSize}" font-weight="600" text-anchor="middle">${snippetCount} Examples</text>
    ` : ''}
    ${endpointCount > 0 ? `
      <rect x="${taglineSize * 11}" y="0" width="${taglineSize * 5.5}" height="${taglineSize * 1.6}" rx="${taglineSize * 0.3}" fill="${isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)'}" stroke="#3b82f6" stroke-width="0.5"/>
      <text x="${taglineSize * 13.75}" y="${taglineSize * 1.1}" fill="#60a5fa" font-family="Inter, Arial, sans-serif" font-size="${metricLabelSize}" font-weight="600" text-anchor="middle">${endpointCount} API Endpoints</text>
    ` : ''}
  </g>

  <!-- devplay branding -->
  <text x="${width - padding}" y="${height - padding}" fill="${textSecondary}" font-family="Inter, Arial, sans-serif" font-size="${metricLabelSize}" font-weight="500" text-anchor="end" opacity="0.5">Built with devplay</text>
</svg>`;
}

/**
 * Render SVG to PNG using sharp.
 */
async function renderSVGtoPNG(
  svg: string,
  outputDir: string,
  size: SocialCardSize,
): Promise<GeneratedFile | null> {
  try {
    const sharp = (await import('sharp')).default;
    const pngPath = join(outputDir, `${size.name}-card.png`);

    await sharp(Buffer.from(svg))
      .resize(size.width, size.height)
      .png({ quality: 90 })
      .toFile(pngPath);

    const { stat } = await import('node:fs/promises');
    const stats = await stat(pngPath);

    logger.success(`Rendered PNG: ${size.name}-card.png`);
    return {
      path: pngPath,
      size: stats.size,
      type: 'png',
    };
  } catch {
    return null;
  }
}

/**
 * Escape XML special characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Truncate a string to a maximum length.
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export default generateSocialCards;
