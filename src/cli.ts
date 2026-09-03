/**
 * devsetgo — CLI Entry Point
 *
 * Main Commander program with all subcommands.
 */

import { Command, CommanderError } from 'commander';
import { createRequire } from 'node:module';
import pc from 'picocolors';
import { log, setVerbose } from './utils/logger.js';

/**
 * Read the version from package.json rather than hardcoding it, so
 * `devsetgo --version` can never drift from the published version.
 */
function readVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    // The bundle lives in dist/, so package.json is one level up.
    const pkg = require('../package.json') as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('devsetgo')
  .description(
    pc.bold('Interactive Developer Playground & Documentation Engine') +
      '\n\n' +
      '  Converts source code, OpenAPI schemas, and Markdown into\n' +
      '  interactive browser playgrounds and CRO-optimized documentation.',
  )
  .version(readVersion(), '-v, --version')
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
    await initCommand(process.cwd(), { ...options, ...program.opts() });
  });

// ── build ─────────────────────────────────────────────────────────────

program
  .command('build')
  .description('Build everything: playground, README, and assets')
  .option('--skip-playground', 'Skip playground generation', false)
  .option('--skip-readme', 'Skip README generation', false)
  .option('--skip-assets', 'Skip asset generation', false)
  .option('--force', 'Overwrite a hand-written README (keeps a .bak copy)', false)
  .action(async (options) => {
    const { buildCommand } = await import('./commands/build.js');
    await buildCommand(process.cwd(), { ...options, ...program.opts() });
  });

// ── readme ────────────────────────────────────────────────────────────

program
  .command('readme')
  .description('Generate a CRO-optimized README')
  .option('-f, --format <format>', 'Output format: github | gitlab', 'github')
  .option('--cta <type>', 'CTA style: dual | install-only | enterprise-only', 'dual')
  .option('--no-cro', 'Disable CRO framework sections')
  .option('--force', 'Overwrite a hand-written README (keeps a .bak copy)', false)
  .action(async (options) => {
    const { readmeCommand } = await import('./commands/readme.js');
    await readmeCommand(process.cwd(), { ...options, ...program.opts() });
  });

// ── playground ────────────────────────────────────────────────────────

program
  .command('playground')
  .description('Generate the interactive browser playground')
  .option('-t, --theme <theme>', 'Theme: dark | light | auto', 'dark')
  .option('--single-file', 'Bundle into a single HTML file', false)
  .action(async (options) => {
    const { playgroundCommand } = await import('./commands/playground.js');
    await playgroundCommand(process.cwd(), { ...options, ...program.opts() });
  });

// ── assets ────────────────────────────────────────────────────────────

program
  .command('assets')
  .description('Generate architecture diagrams and social media cards')
  .option('--type <type>', 'Asset type: diagrams | cards | all', 'all')
  .option('--theme <theme>', 'Theme: dark | light', 'dark')
  .action(async (options) => {
    const { assetsCommand } = await import('./commands/assets.js');
    await assetsCommand(process.cwd(), { ...options, ...program.opts() });
  });

// ── serve ─────────────────────────────────────────────────────────────

program
  .command('serve')
  .description('Start a local dev server for the playground')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('--open', 'Open browser automatically', false)
  .action(async (options) => {
    const { serveCommand } = await import('./commands/serve.js');
    await serveCommand(process.cwd(), { ...options, ...program.opts() });
  });

// ── Parse and run ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    // `--help` and `--version` reach here as CommanderError; they are not
    // failures and carry their own exit code.
    if (err instanceof CommanderError) {
      process.exit(err.exitCode);
    }

    log.error(err instanceof Error ? err.message : String(err));

    if (err instanceof Error && err.stack) {
      log.debug(err.stack);
    }

    process.exitCode = 1;
  }
}

// A rejected promise or thrown error outside the command handlers must still
// produce a non-zero exit, or CI will read a crashed run as a success.
process.on('unhandledRejection', (reason) => {
  log.error(`Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  log.error(`Uncaught exception: ${err.message}`);
  log.debug(err.stack ?? '');
  process.exit(1);
});

void main();
