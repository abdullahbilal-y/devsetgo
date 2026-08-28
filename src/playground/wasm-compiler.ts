/**
 * devsetgo — WASM Compiler
 *
 * Wraps QuickJS-emscripten to compile JavaScript snippets into
 * executable WebAssembly sandboxed contexts.
 */

import { createLogger } from '../utils/logger.js';
import type { CodeSnippet } from '../parser/types.js';

const logger = createLogger('wasm-compiler');

/**
 * Metadata for a compiled WASM-ready snippet.
 */
export interface CompiledSnippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  category: string;
  runnable: boolean;
  expectedOutput?: string;
}

/**
 * Prepare code snippets for browser-side WASM execution.
 *
 * Since QuickJS runs in the browser, we don't compile to WASM here —
 * instead we prepare the snippet metadata and code that will be executed
 * client-side by the QuickJS WASM runtime loaded in the browser.
 */
export function prepareSnippetsForExecution(snippets: CodeSnippet[]): CompiledSnippet[] {
  const hasAnnotated = snippets.some(s => s.runnable);

  const targetSnippets = hasAnnotated
    ? snippets.filter(s => s.runnable && (s.language === 'javascript' || s.language === 'typescript'))
    : snippets.filter(s => s.language === 'javascript' || s.language === 'typescript');

  return targetSnippets
    .map(snippet => {
      let code = snippet.code;

      // Strip TypeScript type annotations for JS execution
      if (snippet.language === 'typescript') {
        code = stripTypeAnnotations(code);
      }

      // Strip export keyword so snippets are standard runnable JS in browser
      code = code.replace(/^export\s+default\s+/gm, '').replace(/^export\s+/gm, '');

      // Auto-invoke top-level function if defined and not already invoked
      const funcMatch = code.match(/function\s+(\w+)\s*\(/);
      if (funcMatch && !code.includes(`${funcMatch[1]}()`) && !code.includes(`${funcMatch[1]}(`)) {
        code = `${code.trim()}\n\n// Auto-run demo:\n${funcMatch[1]}();`;
      }

      // Wrap standalone expressions to capture output
      if (!code.includes('console.log') && !code.includes('console.error')) {
        code = wrapWithOutputCapture(code);
      }

      return {
        id: snippet.id,
        title: snippet.title,
        description: snippet.description,
        code,
        language: snippet.language,
        category: snippet.category || 'examples',
        runnable: snippet.runnable,
        expectedOutput: snippet.expectedOutput,
      };
    });
}

import ts from 'typescript';

/**
 * Strip TypeScript type annotations using the official TypeScript transpileModule API.
 * This guarantees 100% syntactical accuracy without corrupting object properties or colons.
 */
function stripTypeAnnotations(code: string): string {
  try {
    const result = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        removeComments: false,
      },
    });
    return result.outputText.trim();
  } catch {
    return code;
  }
}

/**
 * Wrap code to capture the return value of the last expression.
 */
function wrapWithOutputCapture(code: string): string {
  const lines = code.trim().split('\n');
  const lastLine = lines[lines.length - 1].trim();

  // If the last line is an expression (not a statement), wrap it with console.log
  if (
    lastLine &&
    !lastLine.endsWith(';') &&
    !lastLine.startsWith('//') &&
    !lastLine.startsWith('/*') &&
    !lastLine.startsWith('}') &&
    !lastLine.startsWith('return') &&
    !lastLine.startsWith('if') &&
    !lastLine.startsWith('for') &&
    !lastLine.startsWith('while')
  ) {
    lines[lines.length - 1] = `console.log(${lastLine})`;
  }

  return lines.join('\n');
}

/**
 * Generate the client-side WASM execution runtime code.
 * This script will be embedded in the playground HTML.
 */
export function generateWASMRuntime(): string {
  return `
/**
 * devsetgo — Browser WASM Runtime
 *
 * Uses QuickJS-emscripten to execute JavaScript snippets
 * in a sandboxed WebAssembly environment.
 */

import { getQuickJS } from 'quickjs-emscripten';

let quickJS = null;

/**
 * Initialize the QuickJS WASM runtime.
 */
async function initRuntime() {
  if (!quickJS) {
    quickJS = await getQuickJS();
  }
  return quickJS;
}

/**
 * Execute a JavaScript code string in the QuickJS sandbox.
 * Returns { output: string[], error: string | null, duration: number }
 */
async function executeCode(code) {
  const qjs = await initRuntime();
  const vm = qjs.newContext();
  const output = [];
  const startTime = performance.now();

  try {
    // Redirect console.log to capture output
    const logHandle = vm.newFunction('log', (...args) => {
      const parts = args.map(arg => {
        const str = vm.getString(arg);
        return str;
      });
      output.push(parts.join(' '));
    });

    const consoleHandle = vm.newObject();
    vm.setProp(consoleHandle, 'log', logHandle);
    vm.setProp(consoleHandle, 'info', logHandle);
    vm.setProp(consoleHandle, 'warn', logHandle);
    vm.setProp(consoleHandle, 'error', logHandle);
    vm.setProp(vm.global, 'console', consoleHandle);

    consoleHandle.dispose();
    logHandle.dispose();

    // Execute the code
    const result = vm.evalCode(code);

    if (result.error) {
      const errorMsg = vm.getString(result.error);
      result.error.dispose();
      return {
        output,
        error: errorMsg,
        duration: performance.now() - startTime,
      };
    }

    // Capture return value if any
    const returnValue = vm.getString(result.value);
    result.value.dispose();

    if (returnValue && returnValue !== 'undefined') {
      output.push(returnValue);
    }

    return {
      output,
      error: null,
      duration: performance.now() - startTime,
    };
  } catch (err) {
    return {
      output,
      error: err.message || String(err),
      duration: performance.now() - startTime,
    };
  } finally {
    vm.dispose();
  }
}

// Export to global scope for use by playground UI
window.__devsetgo = {
  initRuntime,
  executeCode,
};
`;
}

export default prepareSnippetsForExecution;
