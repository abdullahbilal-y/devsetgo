/**
 * devsetgo — CTA Block Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateDualCTA,
  generateInstallCTA,
  generateEnterpriseCTA,
  generateInlineCTA,
} from '../../src/readme/cta-blocks.js';
import type { CTAConfig } from '../../src/parser/types.js';

const baseCTA = (enterpriseEnabled: boolean): CTAConfig => ({
  install: { command: 'npm install -g thing', label: 'Get Started' },
  enterprise: {
    enabled: enterpriseEnabled,
    url: 'https://example.test/book',
    label: 'Book a Demo',
    description: 'Enterprise support.',
  },
});

/** Count occurrences of a substring. */
const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

describe('generateDualCTA', () => {
  it('renders both columns when enterprise is enabled', () => {
    const md = generateDualCTA(baseCTA(true));

    expect(md).toContain('Developer Quick Start');
    expect(md).toContain('Enterprise & Teams');
    expect(md).toContain('https://example.test/book');
  });

  it('keeps the section heading when enterprise is disabled', () => {
    // Without the heading the install block renders as an unlabelled orphan
    // wedged between two unrelated sections.
    const md = generateDualCTA(baseCTA(false));

    expect(md).toContain('Get Started');
    expect(md).toContain('npm install -g thing');
  });

  it('omits every enterprise trace when disabled', () => {
    const md = generateDualCTA(baseCTA(false));

    expect(md).not.toContain('Enterprise & Teams');
    expect(md).not.toContain('https://example.test/book');
    expect(md).not.toContain('Book a Demo');
  });

  it('balances its div tags in both layouts', () => {
    for (const enabled of [true, false]) {
      const md = generateDualCTA(baseCTA(enabled));
      expect(count(md, '<div'), `enterprise=${enabled}`).toBe(count(md, '</div>'));
    }
  });

  it('balances its table tags when enterprise is enabled', () => {
    const md = generateDualCTA(baseCTA(true));

    expect(count(md, '<table>')).toBe(count(md, '</table>'));
    expect(count(md, '<td')).toBe(count(md, '</td>'));
  });

  it('emits no table markup in the single-column layout', () => {
    const md = generateDualCTA(baseCTA(false));

    expect(md).not.toContain('<table>');
    expect(md).not.toContain('<td');
  });
});

describe('generateInstallCTA', () => {
  it('renders the label and a fenced command', () => {
    const md = generateInstallCTA(baseCTA(false).install);

    expect(md).toContain('Get Started');
    expect(md).toContain('```bash');
    expect(md).toContain('npm install -g thing');
  });
});

describe('generateEnterpriseCTA', () => {
  it('links the configured URL', () => {
    const md = generateEnterpriseCTA(baseCTA(true).enterprise);

    expect(md).toContain('href="https://example.test/book"');
    expect(md).toContain('Book a Demo');
  });
});

describe('generateInlineCTA', () => {
  it('renders just the command when no URL is given', () => {
    const md = generateInlineCTA('npm i thing');

    expect(md).toContain('npm i thing');
    expect(md).not.toContain('schedule a call');
  });

  it('adds the scheduling line when a URL is given', () => {
    const md = generateInlineCTA('npm i thing', 'https://example.test/book');

    expect(md).toContain('schedule a call');
    expect(md).toContain('https://example.test/book');
  });
});
