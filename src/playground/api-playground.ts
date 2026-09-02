/**
 * devsetgo — API Playground Generator
 *
 * Generates interactive API endpoint testing UI from OpenAPI data.
 */

import type { APIEndpoint } from '../parser/types.js';

/**
 * Generate the API explorer HTML for a set of endpoints.
 */
export function generateAPIExplorerHTML(endpoints: APIEndpoint[], baseUrl: string): string {
  const grouped = groupByTag(endpoints);
  const sidebarItems = generateSidebar(grouped);
  const endpointPanels = generateEndpointPanels(endpoints, baseUrl);

  return `
<div class="api-explorer">
  <div class="api-sidebar">
    <h3 class="api-sidebar__title">API Endpoints</h3>
    ${sidebarItems}
  </div>
  <div class="api-content" id="api-content">
    ${endpointPanels}
  </div>
</div>
`;
}

/**
 * Group endpoints by their first tag.
 */
function groupByTag(endpoints: APIEndpoint[]): Record<string, APIEndpoint[]> {
  const groups: Record<string, APIEndpoint[]> = {};

  for (const ep of endpoints) {
    const tag = ep.tags[0] || 'default';
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(ep);
  }

  return groups;
}

/**
 * Generate sidebar navigation HTML.
 */
function generateSidebar(grouped: Record<string, APIEndpoint[]>): string {
  let html = '';

  for (const [tag, endpoints] of Object.entries(grouped)) {
    html += `<div class="api-sidebar__group">`;
    html += `<h4 class="api-sidebar__group-title">${escapeHtml(tag)}</h4>`;

    for (const ep of endpoints) {
      const methodClass = `method--${ep.method.toLowerCase()}`;
      html += `
        <button class="api-sidebar__item" data-endpoint="${escapeHtml(ep.method + ' ' + ep.path)}"
                onclick="showEndpoint('${escapeHtml(ep.method)}_${escapeHtml(ep.path.replace(/[^a-zA-Z0-9]/g, '_'))}')">
          <span class="api-method ${methodClass}">${ep.method}</span>
          <span class="api-path">${escapeHtml(ep.path)}</span>
        </button>`;
    }

    html += `</div>`;
  }

  return html;
}

/**
 * Generate endpoint detail panels.
 */
function generateEndpointPanels(endpoints: APIEndpoint[], baseUrl: string): string {
  return endpoints
    .map((ep) => {
      const panelId = `${ep.method}_${ep.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const methodClass = `method--${ep.method.toLowerCase()}`;

      return `
    <div class="api-panel" id="panel-${panelId}" style="display:none;">
      <div class="api-panel__header">
        <span class="api-method api-method--large ${methodClass}">${ep.method}</span>
        <code class="api-panel__path">${escapeHtml(baseUrl)}${escapeHtml(ep.path)}</code>
      </div>

      <p class="api-panel__description">${escapeHtml(ep.summary)}</p>
      ${ep.description ? `<p class="api-panel__detail">${escapeHtml(ep.description)}</p>` : ''}

      ${generateParameterInputs(ep)}
      ${generateRequestBodyInput(ep)}
      ${generateAuthInput(ep)}

      <div class="api-panel__actions">
        <button class="btn btn--primary" onclick="sendRequest('${panelId}')">
          ▶ Send Request
        </button>
        <button class="btn btn--secondary" onclick="generateCurl('${panelId}')">
          📋 Copy cURL
        </button>
      </div>

      <div class="api-panel__response" id="response-${panelId}">
        <div class="api-response__placeholder">
          Response will appear here after sending a request.
        </div>
      </div>
    </div>`;
    })
    .join('\n');
}

/**
 * Generate parameter input fields for an endpoint.
 */
function generateParameterInputs(ep: APIEndpoint): string {
  if (ep.parameters.length === 0) return '';

  const rows = ep.parameters
    .map((param) => {
      const required = param.required ? '<span class="required">*</span>' : '';
      return `
      <tr>
        <td><code>${escapeHtml(param.name)}</code>${required}</td>
        <td><span class="param-in">${param.in}</span></td>
        <td>
          <input type="text" class="input" name="param-${escapeHtml(param.name)}"
                 placeholder="${escapeHtml(param.description || param.name)}"
                 ${param.example ? `value="${escapeHtml(String(param.example))}"` : ''} />
        </td>
      </tr>`;
    })
    .join('');

  return `
    <div class="api-panel__params">
      <h4>Parameters</h4>
      <table class="params-table">
        <thead><tr><th>Name</th><th>In</th><th>Value</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/**
 * Generate request body textarea.
 */
function generateRequestBodyInput(ep: APIEndpoint): string {
  if (!ep.requestBody) return '';

  const example = ep.requestBody.example
    ? JSON.stringify(ep.requestBody.example, null, 2)
    : '{\n  \n}';

  return `
    <div class="api-panel__body">
      <h4>Request Body <span class="content-type">${escapeHtml(ep.requestBody.contentType)}</span></h4>
      <textarea class="code-input" name="request-body" rows="8">${escapeHtml(example)}</textarea>
    </div>`;
}

/**
 * Generate auth input field.
 */
function generateAuthInput(ep: APIEndpoint): string {
  if (!ep.auth) return '';

  let placeholder = 'Bearer token';
  if (ep.auth.type === 'apiKey') {
    placeholder = `API Key (in ${ep.auth.in}: ${ep.auth.name})`;
  }

  return `
    <div class="api-panel__auth">
      <h4>Authentication</h4>
      <input type="text" class="input" name="auth-token"
             placeholder="${escapeHtml(placeholder)}" />
    </div>`;
}

/**
 * Escape HTML entities.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate the client-side API request handling script.
 */
export function generateAPIClientScript(baseUrl: string): string {
  return `
/**
 * devsetgo — API Client (Browser-side)
 */

function showEndpoint(panelId) {
  document.querySelectorAll('.api-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('panel-' + panelId);
  if (panel) panel.style.display = 'block';

  document.querySelectorAll('.api-sidebar__item').forEach(i => i.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

async function sendRequest(panelId) {
  const panel = document.getElementById('panel-' + panelId);
  const responseDiv = document.getElementById('response-' + panelId);
  const baseUrl = '${baseUrl}';

  // Gather parameters
  const params = {};
  panel.querySelectorAll('[name^="param-"]').forEach(input => {
    if (input.value) {
      params[input.name.replace('param-', '')] = input.value;
    }
  });

  // Gather request body
  const bodyInput = panel.querySelector('[name="request-body"]');
  let body = null;
  if (bodyInput && bodyInput.value.trim()) {
    try {
      body = JSON.parse(bodyInput.value);
    } catch (e) {
      responseDiv.innerHTML = '<pre class="error">Invalid JSON in request body: ' + e.message + '</pre>';
      return;
    }
  }

  // Gather auth
  const authInput = panel.querySelector('[name="auth-token"]');
  const authToken = authInput ? authInput.value : null;

  // Build URL
  const method = panelId.split('_')[0];
  let path = panelId.split('_').slice(1).join('/');

  // Substitute path params
  for (const [key, value] of Object.entries(params)) {
    path = path.replace('{' + key + '}', encodeURIComponent(value));
  }

  const url = baseUrl + '/' + path;

  responseDiv.innerHTML = '<div class="loading">Sending request...</div>';

  const startTime = performance.now();

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = (performance.now() - startTime).toFixed(0);
    const responseBody = await response.text();
    let formatted;
    try {
      formatted = JSON.stringify(JSON.parse(responseBody), null, 2);
    } catch {
      formatted = responseBody;
    }

    const statusClass = response.ok ? 'status--success' : 'status--error';

    responseDiv.innerHTML = \`
      <div class="response-header">
        <span class="response-status \${statusClass}">\${response.status} \${response.statusText}</span>
        <span class="response-time">\${duration}ms</span>
      </div>
      <pre class="response-body"><code>\${escapeHtmlInScript(formatted)}</code></pre>
    \`;
  } catch (err) {
    responseDiv.innerHTML = '<pre class="error">Request failed: ' + err.message + '</pre>';
  }
}

function escapeHtmlInScript(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generateCurl(panelId) {
  const panel = document.getElementById('panel-' + panelId);
  const method = panelId.split('_')[0];
  let curl = 'curl -X ' + method;

  const bodyInput = panel.querySelector('[name="request-body"]');
  if (bodyInput && bodyInput.value.trim()) {
    curl += " -H 'Content-Type: application/json'";
    curl += " -d '" + bodyInput.value.trim() + "'";
  }

  const authInput = panel.querySelector('[name="auth-token"]');
  if (authInput && authInput.value) {
    curl += " -H 'Authorization: Bearer " + authInput.value + "'";
  }

  curl += ' ${baseUrl}/' + panelId.split('_').slice(1).join('/');

  navigator.clipboard.writeText(curl).then(() => {
    const btn = event.currentTarget;
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy cURL'; }, 2000);
  });
}
`;
}

export default generateAPIExplorerHTML;
