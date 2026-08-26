/**
 * devsetgo — CLI Entry Point
 *
 * Main Commander program with all subcommands.
 */

import { Command } from 'commander';
import pc from 'picocolors';
import { log, setVerbose } from './utils/logger.js';

const program = new Command();

program
  .name('devsetgo')
  .description(
    pc.bold('Interactive Developer Playground & Documentation Engine') +
    '\n\n' +
    '  Converts source code, OpenAPI schemas, and Markdown into\n' +
    '  interactive browser playgrounds and CRO-optimized documentation.',
  )
  .version('1.0.0', '-v, --version')
  .option('-c, --config <path>', 'Path to devsetgo config file')
  .option('--verbose', 'Enable verbose debug output', false)
  .option('-o, --output <dir>', 'Output directory for generated files')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      setVerbose(true);
    }
  });

// ── init ──────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Initialize devsetgo configuration for your project')
  .option('--force', 'Overwrite existing configuration', false)
  .action(async (options) => {
    const { initCommand } = await import('./commands/init.js');
    await initCommand(process.cwd(), {
      ...options,
      ...program.opts(),
    });
  });

// ── build ─────────────────────────────────────────────────────────────

program
  .command('build')
  .description('Build everything: playground, README, and assets')
  .option('--skip-playground', 'Skip playground generation', false)
  .option('--skip-readme', 'Skip README generation', false)
  .option('--skip-assets', 'Skip asset generation', false)
  .action(async (options) => {
    const { buildCommand } = await import('./commands/build.js');
    await buildCommand(process.cwd(), {
      ...options,
      ...program.opts(),
    });
  });

// ── readme ────────────────────────────────────────────────────────────

program
  .command('readme')
  .description('Generate a CRO-optimized README')
  .option('-f, --format <format>', 'Output format: github | gitlab', 'github')
  .option('--cta <type>', 'CTA style: dual | install-only | enterprise-only', 'dual')
  .option('--no-cro', 'Disable CRO framework sections')
  .action(async (options) => {
    const { readmeCommand } = await import('./commands/readme.js');
    await readmeCommand(process.cwd(), {
      ...options,
      ...program.opts(),
    });
  });

// ── playground ────────────────────────────────────────────────────────

program
  .command('playground')
  .description('Generate the interactive browser playground')
  .option('-t, --theme <theme>', 'Theme: dark | light | auto', 'dark')
  .option('--single-file', 'Bundle into a single HTML file', false)
  .action(async (options) => {
    const { playgroundCommand } = await import('./commands/playground.js');
    await playgroundCommand(process.cwd(), {
      ...options,
      ...program.opts(),
    });
  });

// ── assets ────────────────────────────────────────────────────────────

program
  .command('assets')
  .description('Generate architecture diagrams and social media cards')
  .option('--type <type>', 'Asset type: diagrams | cards | all', 'all')
  .option('--theme <theme>', 'Theme: dark | light', 'dark')
  .action(async (options) => {
    const { assetsCommand } = await import('./commands/assets.js');
    await assetsCommand(process.cwd(), {
      ...options,
      ...program.opts(),
    });
  });

// ── serve ─────────────────────────────────────────────────────────────

program
  .command('serve')
  .description('Start a local dev server for the playground')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('--open', 'Open browser automatically', false)
  .action(async (options) => {
    const { serveCommand } = await import('./commands/serve.js');
    await serveCommand(process.cwd(), {
      ...options,
      ...program.opts(),
    });
  });

// ── Parse and run ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
