/**
 * devsetgo — OpenAPI Parser
 *
 * Parses OpenAPI 3.x schemas and extracts interactive endpoint definitions.
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import { resolve } from 'node:path';
import { createLogger } from '../utils/logger.js';
import type { APIEndpoint, APIParameter, APIRequestBody, APIResponse, APIAuth } from './types.js';

const logger = createLogger('openapi-parser');

/** OpenAPI types we work with */
interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string; description?: string };
  paths?: Record<string, Record<string, OpenAPIOperation>>;
  components?: {
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    schemas?: Record<string, unknown>;
  };
  security?: Record<string, string[]>[];
}

interface OpenAPIOperation {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
  security?: Record<string, string[]>[];
  operationId?: string;
}

interface OpenAPIParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: Record<string, unknown>; example?: unknown }>;
}

interface OpenAPIResponse {
  description?: string;
  content?: Record<string, { schema?: Record<string, unknown>; example?: unknown }>;
}

interface OpenAPISecurityScheme {
  type: string;
  scheme?: string;
  name?: string;
  in?: string;
  bearerFormat?: string;
}

/**
 * Parse an OpenAPI schema file and extract endpoint definitions.
 */
export async function parseOpenAPIFile(filePath: string): Promise<APIEndpoint[]> {
  const absPath = resolve(filePath);
  logger.debug(`Parsing OpenAPI schema: ${filePath}`);

  let spec: OpenAPISpec;

  try {
    // Validate and dereference the spec (resolves $ref pointers)
    spec = (await SwaggerParser.validate(absPath)) as unknown as OpenAPISpec;
  } catch (err) {
    logger.warn(`Failed to validate OpenAPI schema: ${filePath}`);
    logger.debug(String(err));

    // Try parsing without full validation
    try {
      spec = (await SwaggerParser.parse(absPath)) as unknown as OpenAPISpec;
    } catch {
      logger.error(`Cannot parse OpenAPI schema: ${filePath}`);
      return [];
    }
  }

  const endpoints: APIEndpoint[] = [];
  const globalAuth = extractGlobalAuth(spec);

  if (!spec.paths) {
    logger.warn(`No paths found in OpenAPI schema: ${filePath}`);
    return [];
  }

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      // Skip non-HTTP method keys (like 'parameters', 'summary', etc.)
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(method)) {
        continue;
      }

      const op = operation as OpenAPIOperation;

      const endpoint: APIEndpoint = {
        method: method.toUpperCase(),
        path,
        summary: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
        description: op.description || '',
        tags: op.tags || ['default'],
        parameters: extractParameters(op.parameters),
        requestBody: extractRequestBody(op.requestBody),
        responses: extractResponses(op.responses),
        auth: extractOperationAuth(op, spec) || globalAuth,
      };

      endpoints.push(endpoint);
    }
  }

  logger.info(`Extracted ${endpoints.length} API endpoints from ${filePath}`);
  return endpoints;
}

/**
 * Extract parameters from an OpenAPI operation.
 */
function extractParameters(params?: OpenAPIParameter[]): APIParameter[] {
  if (!params) return [];

  return params.map(p => ({
    name: p.name,
    in: p.in as APIParameter['in'],
    required: p.required || false,
    description: p.description || '',
    schema: p.schema || {},
    example: p.example,
  }));
}

/**
 * Extract request body definition.
 */
function extractRequestBody(body?: OpenAPIRequestBody): APIRequestBody | undefined {
  if (!body?.content) return undefined;

  // Prefer JSON content type
  const contentType = Object.keys(body.content).find(ct => ct.includes('json'))
    || Object.keys(body.content)[0];

  if (!contentType) return undefined;

  const content = body.content[contentType];

  return {
    description: body.description || '',
    required: body.required || false,
    contentType,
    schema: content?.schema || {},
    example: content?.example,
  };
}

/**
 * Extract response definitions.
 */
function extractResponses(responses?: Record<string, OpenAPIResponse>): Record<string, APIResponse> {
  if (!responses) return {};

  const result: Record<string, APIResponse> = {};

  for (const [statusCode, response] of Object.entries(responses)) {
    const resp = response as OpenAPIResponse;

    let contentType: string | undefined;
    let schema: Record<string, unknown> | undefined;
    let example: unknown;

    if (resp.content) {
      contentType = Object.keys(resp.content).find(ct => ct.includes('json'))
        || Object.keys(resp.content)[0];

      if (contentType) {
        const content = resp.content[contentType];
        schema = content?.schema;
        example = content?.example;
      }
    }

    result[statusCode] = {
      description: resp.description || '',
      contentType,
      schema,
      example,
    };
  }

  return result;
}

/**
 * Extract global authentication from the spec.
 */
function extractGlobalAuth(spec: OpenAPISpec): APIAuth | undefined {
  if (!spec.security || !spec.components?.securitySchemes) return undefined;

  const firstSecurity = spec.security[0];
  if (!firstSecurity) return undefined;

  const schemeName = Object.keys(firstSecurity)[0];
  if (!schemeName) return undefined;

  const scheme = spec.components.securitySchemes[schemeName];
  if (!scheme) return undefined;

  return mapSecurityScheme(scheme);
}

/**
 * Extract operation-level authentication.
 */
function extractOperationAuth(op: OpenAPIOperation, spec: OpenAPISpec): APIAuth | undefined {
  if (!op.security || !spec.components?.securitySchemes) return undefined;

  const firstSecurity = op.security[0];
  if (!firstSecurity) return undefined;

  const schemeName = Object.keys(firstSecurity)[0];
  if (!schemeName) return undefined;

  const scheme = spec.components.securitySchemes[schemeName];
  if (!scheme) return undefined;

  return mapSecurityScheme(scheme);
}

/**
 * Map an OpenAPI security scheme to our APIAuth type.
 */
function mapSecurityScheme(scheme: OpenAPISecurityScheme): APIAuth {
  return {
    type: scheme.type as APIAuth['type'],
    scheme: scheme.scheme,
    name: scheme.name,
    in: scheme.in,
  };
}

/**
 * Parse multiple OpenAPI schema files.
 */
export async function parseOpenAPIFiles(filePaths: string[]): Promise<APIEndpoint[]> {
  const allEndpoints: APIEndpoint[] = [];

  for (const filePath of filePaths) {
    try {
      const endpoints = await parseOpenAPIFile(filePath);
      allEndpoints.push(...endpoints);
    } catch (err) {
      logger.warn(`Failed to parse ${filePath}: ${err}`);
    }
  }

  return allEndpoints;
}

export default parseOpenAPIFiles;
