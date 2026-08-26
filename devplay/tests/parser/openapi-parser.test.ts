/**
 * devplay — OpenAPI Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseOpenAPIFile } from '../../src/parser/openapi-parser.js';
import { resolve } from 'node:path';

const FIXTURE_PATH = resolve(import.meta.dirname, '../fixtures/openapi.yaml');

describe('OpenAPI Parser', () => {
  it('should parse endpoints from an OpenAPI schema', async () => {
    const endpoints = await parseOpenAPIFile(FIXTURE_PATH);

    expect(endpoints.length).toBeGreaterThanOrEqual(4);
  });

  it('should extract HTTP methods correctly', async () => {
    const endpoints = await parseOpenAPIFile(FIXTURE_PATH);

    const methods = endpoints.map(e => e.method);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('DELETE');
  });

  it('should extract endpoint paths', async () => {
    const endpoints = await parseOpenAPIFile(FIXTURE_PATH);

    const paths = endpoints.map(e => e.path);
    expect(paths).toContain('/pets');
    expect(paths).toContain('/pets/{petId}');
  });

  it('should extract parameters', async () => {
    const listEndpoint = (await parseOpenAPIFile(FIXTURE_PATH))
      .find(e => e.method === 'GET' && e.path === '/pets');

    expect(listEndpoint).toBeDefined();
    expect(listEndpoint!.parameters.length).toBeGreaterThanOrEqual(1);

    const limitParam = listEndpoint!.parameters.find(p => p.name === 'limit');
    expect(limitParam).toBeDefined();
    expect(limitParam!.in).toBe('query');
  });

  it('should extract request body for POST', async () => {
    const createEndpoint = (await parseOpenAPIFile(FIXTURE_PATH))
      .find(e => e.method === 'POST' && e.path === '/pets');

    expect(createEndpoint).toBeDefined();
    expect(createEndpoint!.requestBody).toBeDefined();
    expect(createEndpoint!.requestBody!.contentType).toContain('json');
  });

  it('should extract authentication', async () => {
    const endpoints = await parseOpenAPIFile(FIXTURE_PATH);

    // At least one endpoint should have auth
    const withAuth = endpoints.filter(e => e.auth);
    expect(withAuth.length).toBeGreaterThan(0);
    expect(withAuth[0].auth!.type).toBe('http');
    expect(withAuth[0].auth!.scheme).toBe('bearer');
  });

  it('should extract tags', async () => {
    const endpoints = await parseOpenAPIFile(FIXTURE_PATH);

    for (const ep of endpoints) {
      expect(ep.tags).toContain('pets');
    }
  });
});
