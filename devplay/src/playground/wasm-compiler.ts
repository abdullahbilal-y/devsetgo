/**
 * devplay — WASM Compiler
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
  return snippets
    .filter(s => s.language === 'javascript' || s.language === 'typescript')
    .map(snippet => {
      let code = snippet.code;

      // Strip TypeScript type annotations for JS execution
      if (snippet.language === 'typescript') {
        code = stripTypeAnnotations(code);
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

/**
 * Strip basic TypeScript type annotations for QuickJS execution.
 * This is a simplified transform — not a full TS compiler.
 */
function stripTypeAnnotations(code: string): string {
  return code
    // Remove type imports
    .replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\s*/g, '')
    // Remove interface/type declarations
    .replace(/(?:export\s+)?(?:interface|type)\s+\w+[\s\S]*?(?=\n(?:export|function|class|const|let|var|import|\n))/g, '')
    // Remove parameter type annotations
    .replace(/:\s*\w+(?:\[\])?(?:\s*\|[^,)=]*)?/g, '')
    // Remove return type annotations
    .replace(/\)\s*:\s*\w+(?:\[\])?(?:\s*\|[^{]*)?/g, ')')
    // Remove generic type parameters
    .replace(/<\w+(?:\s+extends\s+\w+)?>/g, '')
    // Remove 'as' type assertions
    .replace(/\s+as\s+\w+/g, '')
    // Clean up any remaining artifacts
    .replace(/\n{3,}/g, '\n\n');
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
 * devplay — Browser WASM Runtime
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
window.__devplay = {
  initRuntime,
  executeCode,
};
`;
}

export default prepareSnippetsForExecution;
