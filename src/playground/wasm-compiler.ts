/**
 * devsetgo — Snippet Preparation
 *
 * Prepares source snippets for execution by the browser-side QuickJS
 * WebAssembly runtime (see `runtime.ts`, which owns the client code).
 */

import ts from 'typescript';
import type { CodeSnippet } from '../parser/types.js';

/**
 * Metadata for a snippet that is ready to run in the browser sandbox.
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

/** Languages the browser QuickJS runtime can execute. */
const EXECUTABLE_LANGUAGES = new Set(['javascript', 'typescript']);

/**
 * Prepare code snippets for browser-side WASM execution.
 *
 * Nothing is compiled to WebAssembly here — QuickJS itself is the WASM module,
 * and it runs in the browser. This step strips types, removes ESM syntax the
 * sandbox cannot resolve, and makes each snippet produce visible output.
 */
export function prepareSnippetsForExecution(snippets: CodeSnippet[]): CompiledSnippet[] {
  const hasAnnotated = snippets.some((s) => s.runnable);

  const targetSnippets = snippets.filter(
    (s) => EXECUTABLE_LANGUAGES.has(s.language) && (!hasAnnotated || s.runnable),
  );

  return targetSnippets.map((snippet) => ({
    id: snippet.id,
    title: snippet.title,
    description: snippet.description,
    code: prepareCode(snippet.code, snippet.language),
    language: snippet.language,
    category: snippet.category || 'examples',
    runnable: snippet.runnable,
    expectedOutput: snippet.expectedOutput,
  }));
}

/**
 * Transform one snippet's source into something the sandbox can run directly.
 */
export function prepareCode(source: string, language: string): string {
  let code = source;

  if (language === 'typescript') {
    code = stripTypeAnnotations(code);
  }

  // The sandbox has no module loader, so `export` is a syntax error there.
  code = stripExports(code);

  code = appendAutoInvocation(code);

  // A snippet that never logs would run and show nothing.
  if (!/\bconsole\.(log|error|warn|info)\b/.test(code)) {
    code = wrapWithOutputCapture(code);
  }

  return code;
}

/**
 * Strip TypeScript type annotations using the official transpiler.
 *
 * Uses `transpileModule` rather than regex substitution so object literals,
 * ternaries, and generics survive intact.
 */
export function stripTypeAnnotations(code: string): string {
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

/** Remove `export` / `export default` prefixes, leaving plain declarations. */
function stripExports(code: string): string {
  return code.replace(/^[ \t]*export\s+default\s+/gm, '').replace(/^[ \t]*export\s+/gm, '');
}

/**
 * Append a call to a snippet's top-level function when nothing invokes it.
 *
 * The call must be detected at column zero. Searching the whole body instead
 * would treat a recursive call (`fibonacci(n - 1)`) as an existing invocation,
 * so recursive demos would define a function and then print nothing.
 */
export function appendAutoInvocation(code: string): string {
  const declaration = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/m.exec(code);
  if (!declaration) return code;

  const fnName = declaration[1];

  // A top-level call is one that starts its own line with no indentation —
  // anything indented is inside the function body.
  const topLevelCall = new RegExp(`^(?:await\\s+|void\\s+)?${escapeRegExp(fnName)}\\s*\\(`, 'm');

  // Exclude the declaration line itself from the search.
  const withoutDeclaration = code.replace(/^(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/gm, '');

  if (topLevelCall.test(withoutDeclaration)) return code;

  return `${code.trim()}\n\n// Run the demo:\n${fnName}();`;
}

/** Escape a string for literal use inside a RegExp. */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wrap a trailing bare expression in `console.log` so it produces output.
 */
export function wrapWithOutputCapture(code: string): string {
  const lines = code.trimEnd().split('\n');
  const lastIndex = lines.length - 1;
  const lastLine = lines[lastIndex]?.trim() ?? '';

  const isStatement =
    !lastLine ||
    lastLine.endsWith(';') ||
    lastLine.endsWith('{') ||
    lastLine.startsWith('//') ||
    lastLine.startsWith('/*') ||
    lastLine.startsWith('*') ||
    lastLine.startsWith('}') ||
    /^(return|if|for|while|switch|try|catch|finally|else|const|let|var|function|class|throw)\b/.test(
      lastLine,
    );

  if (isStatement) return lines.join('\n');

  lines[lastIndex] = `console.log(${lastLine})`;
  return lines.join('\n');
}

export default prepareSnippetsForExecution;
