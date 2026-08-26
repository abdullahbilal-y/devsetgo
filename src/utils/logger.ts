/**
 * devsetgo — Logger Utility
 *
 * Structured terminal logging with colors, levels, and spinners.
 */

import pc from 'picocolors';

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

let currentVerbose = false;

/**
 * Set the global verbosity level.
 */
export function setVerbose(verbose: boolean): void {
  currentVerbose = verbose;
}

/**
 * Format a prefix tag for log messages.
 */
function tag(label: string, colorFn: (s: string) => string): string {
  return colorFn(pc.bold(` ${label} `));
}

/**
 * Log a debug message (only shown in verbose mode).
 */
export function debug(message: string, ...args: unknown[]): void {
  if (!currentVerbose) return;
  console.log(`${tag('DEBUG', pc.gray)} ${pc.gray(message)}`, ...args);
}

/**
 * Log an informational message.
 */
export function info(message: string, ...args: unknown[]): void {
  console.log(`${tag('INFO', pc.blue)} ${message}`, ...args);
}

/**
 * Log a success message.
 */
export function success(message: string, ...args: unknown[]): void {
  console.log(`${tag('  ✓ ', pc.green)} ${pc.green(message)}`, ...args);
}

/**
 * Log a warning message.
 */
export function warn(message: string, ...args: unknown[]): void {
  console.warn(`${tag('WARN', pc.yellow)} ${pc.yellow(message)}`, ...args);
}

/**
 * Log an error message.
 */
export function error(message: string, ...args: unknown[]): void {
  console.error(`${tag('ERROR', pc.red)} ${pc.red(message)}`, ...args);
}

/**
 * Log a step in a multi-step process.
 */
export function step(current: number, total: number, message: string): void {
  const progress = pc.dim(`[${current}/${total}]`);
  console.log(`${progress} ${message}`);
}

/**
 * Print a banner header.
 */
export function banner(text: string): void {
  const line = '─'.repeat(Math.max(text.length + 4, 40));
  console.log('');
  console.log(pc.cyan(line));
  console.log(pc.cyan(pc.bold(`  ${text}`)));
  console.log(pc.cyan(line));
  console.log('');
}

/**
 * Print a section header.
 */
export function section(title: string): void {
  console.log('');
  console.log(pc.bold(pc.underline(title)));
}

/**
 * Simple inline spinner for long-running operations.
 * Returns stop() function to clear the spinner.
 */
export function spinner(message: string): { stop: (finalMessage?: string) => void } {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(`\r${pc.cyan(frames[i % frames.length])} ${message}`);
    i++;
  }, 80);

  return {
    stop(finalMessage?: string) {
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(message.length + 4) + '\r');
      if (finalMessage) {
        success(finalMessage);
      }
    },
  };
}

/**
 * Create a namespaced logger for a specific module.
 */
export function createLogger(namespace: string) {
  const prefix = pc.dim(`[${namespace}]`);
  return {
    debug: (msg: string, ...args: unknown[]) => debug(`${prefix} ${msg}`, ...args),
    info: (msg: string, ...args: unknown[]) => info(`${prefix} ${msg}`, ...args),
    success: (msg: string, ...args: unknown[]) => success(`${prefix} ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) => warn(`${prefix} ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) => error(`${prefix} ${msg}`, ...args),
    step: (current: number, total: number, msg: string) => step(current, total, `${prefix} ${msg}`),
  };
}

export const log = {
  debug,
  info,
  success,
  warn,
  error,
  step,
  banner,
  section,
  spinner,
  setVerbose,
  createLogger,
};

export default log;
