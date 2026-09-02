/**
 * devsetgo — Playground Demos
 *
 * Annotated sample functions that the parser turns into runnable playground
 * snippets for this repo's own docs site. Kept out of `src/index.ts` so the
 * published API surface stays limited to the library itself.
 */

// ── Interactive Playground Demos ────────────────────────────────────

/**
 * @playground {"title": "🚀 Hello devsetgo (Quick Start)", "category": "Interactive Demos", "runnable": true}
 * Interactive introduction to devsetgo — transforms source code into WASM playgrounds.
 */
export function helloDevSetGo(): void {
  console.log('⚡ Welcome to devsetgo!');
  console.log('--------------------------------------------------');
  console.log('📦 Status: WebAssembly QuickJS Runtime Active');
  console.log('🚀 Mission: Convert GitHub repo visits into adoption');
  console.log('');

  const stats = {
    playgroundLoadTime: '< 2s',
    readmeGenerationSpeed: '< 500ms',
    supportedParsers: ['Code (JS/TS/Py/Rust/Go)', 'OpenAPI 3.x', 'Markdown'],
    outputEngines: ['WASM Playground', 'CRO README', 'Mermaid Diagrams', 'Social Cards'],
  };

  console.log('📊 Engine Capabilities:');
  console.log(stats);
  console.log('\n💡 Try editing this code in the editor and click ▶ Run (or press Ctrl+Enter)!');
}

/**
 * @playground {"title": "📊 Developer Conversion ROI Calculator", "category": "Interactive Demos", "runnable": true}
 * Calculate adoption funnel improvements when using interactive playgrounds vs static docs.
 */
export function calculateConversionROI(monthlyVisitors = 5000): object {
  console.log(
    `📈 Analyzing DevTool Adoption Funnel for ${monthlyVisitors.toLocaleString()} visitors/month...\n`,
  );

  // Standard static README conversion benchmarks
  const staticCloneRate = 0.04; // 4% clone
  const staticInstallSuccess = 0.4; // 40% successfully install & run
  const staticLeads = monthlyVisitors * staticCloneRate * staticInstallSuccess;

  // devsetgo interactive playground conversion benchmarks
  const playgroundTryRate = 0.35; // 35% try browser playground (zero friction)
  const playgroundAdoptRate = 0.18; // 18% adopt after live testing
  const devsetgoLeads = monthlyVisitors * playgroundTryRate * playgroundAdoptRate;

  const upliftMultiplier = (devsetgoLeads / Math.max(1, staticLeads)).toFixed(1);

  const report = {
    monthlyVisitors,
    traditionalStaticDocs: {
      clonedRepo: Math.round(monthlyVisitors * staticCloneRate),
      successfulFirstRun: Math.round(staticLeads),
    },
    withDevSetGoPlayground: {
      instantEvaluations: Math.round(monthlyVisitors * playgroundTryRate),
      convertedDevelopers: Math.round(devsetgoLeads),
    },
    conversionBoost: `+${(((devsetgoLeads - staticLeads) / staticLeads) * 100).toFixed(0)}% (${upliftMultiplier}x more developer adoption)`,
  };

  console.log(report);
  return report;
}

/**
 * @playground {"title": "🎨 Dynamic CRO Badge Generator", "category": "Interactive Demos", "runnable": true}
 * Generates branded shields.io badge Markdown for high-converting GitHub documentation.
 */
export function generateShieldsBadge(toolName = 'my-devtool', version = '2.4.0'): string[] {
  console.log(`🎨 Generating conversion badges for "${toolName}" v${version}...\n`);

  const badges = [
    `[![Playground](https://img.shields.io/badge/%E2%96%B6%20-Live%20Playground-7c3aed?style=for-the-badge)](https://abdullahbilal-y.github.io/${toolName}/)`,
    `[![Version](https://img.shields.io/badge/version-${version}-0969da?style=for-the-badge)](https://www.npmjs.com/package/${toolName})`,
    `[![License: MIT](https://img.shields.io/badge/license-MIT-009688?style=for-the-badge)](LICENSE)`,
    `[![Fast WASM](https://img.shields.io/badge/runtime-QuickJS%20WASM-6366f1?style=for-the-badge)](#)`,
  ];

  for (const b of badges) {
    console.log(b);
  }

  console.log('\n✅ Badges ready for copy-pasting into your README.md!');
  return badges;
}

/**
 * @playground {"title": "🔍 OpenAPI Endpoint Mock Explorer", "category": "Interactive Demos", "runnable": true}
 * Interactive sample demonstrating how OpenAPI endpoints are parsed and executed in browser.
 */
export function mockOpenAPIExplorer(): void {
  const endpoints = [
    { method: 'GET', path: '/v1/playgrounds', status: 200, summary: 'List active sandboxes' },
    { method: 'POST', path: '/v1/execute', status: 201, summary: 'Compile & execute WASM snippet' },
    {
      method: 'GET',
      path: '/v1/metrics/funnel',
      status: 200,
      summary: 'Fetch developer CRO metrics',
    },
  ];

  console.log('🌐 Simulated OpenAPI 3.0 Endpoints:\n');
  for (const ep of endpoints) {
    console.log(`[${ep.method.padEnd(4)}] ${ep.path.padEnd(22)} → ${ep.summary} (${ep.status})`);
  }

  console.log(
    '\n💡 You can test real endpoints with live parameters in the API Explorer tab above!',
  );
}

/**
 * @playground {"title": "✨ JavaScript Sandbox (Live Scratchpad)", "category": "Interactive Demos", "runnable": true}
 * Freeform JavaScript execution environment running sandboxed in your browser via QuickJS WebAssembly.
 */
export function scratchpadSandbox(): object {
  console.log('🧪 Running in QuickJS WebAssembly Sandbox...');

  // You can write any modern JavaScript code here!
  const numbers = [12, 45, 78, 23, 56, 89, 90, 34];
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  const avg = sum / numbers.length;

  const result = {
    input: numbers,
    sorted,
    sum,
    average: avg,
    timestamp: new Date().toISOString(),
    sandboxMemory: 'Sandboxed (No network access)',
  };

  console.log('Calculated Result:');
  console.log(result);
  return result;
}
