// Minimal hand-authored OpenAPI spec (no build step). Extend per module as the
// API grows; the JSDoc @openapi blocks in routes document the same endpoints.
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TNIP-R API',
    version: '0.1.0',
    description: 'Telecom Network Intelligence Platform — Regulatory Edition. Multi-operator OSS analytics & QoS compliance.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': { post: { tags: ['Auth'], summary: 'Login', security: [], responses: { 200: { description: 'OK' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', responses: { 200: { description: 'OK' } } } },
    '/operators': {
      get: { tags: ['Operators'], summary: 'List operators', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Operators'], summary: 'Create operator', responses: { 201: { description: 'Created' } } },
    },
    '/operators/{operatorId}': { get: { tags: ['Operators'], summary: 'Operator profile + summary', responses: { 200: { description: 'OK' } } } },
    '/ingestion/upload': { post: { tags: ['Ingestion'], summary: 'Upload Huawei PM CSV (auto KPI + compliance)', responses: { 201: { description: 'Ingested' } } } },
    '/ingestion/files': { get: { tags: ['Ingestion'], summary: 'List PM files', responses: { 200: { description: 'OK' } } } },
    '/kpis/definitions': { get: { tags: ['KPI'], summary: 'List KPI definitions', responses: { 200: { description: 'OK' } } } },
    '/kpis/comparison': { get: { tags: ['KPI'], summary: 'Cross-operator KPI matrix', responses: { 200: { description: 'OK' } } } },
    '/kpis/timeseries': { get: { tags: ['KPI'], summary: 'KPI time-series for an operator', responses: { 200: { description: 'OK' } } } },
    '/kpis/validate': { post: { tags: ['KPI'], summary: 'Validate a KPI formula', responses: { 200: { description: 'OK' } } } },
    '/compliance/matrix': { get: { tags: ['Compliance'], summary: 'Compliance matrix (operators × KPIs)', responses: { 200: { description: 'OK' } } } },
    '/compliance/alerts': { get: { tags: ['Compliance'], summary: 'Compliance alerts', responses: { 200: { description: 'OK' } } } },
    '/compliance/evaluate': { post: { tags: ['Compliance'], summary: 'Evaluate operator compliance', responses: { 200: { description: 'OK' } } } },
    '/rankings': { get: { tags: ['Ranking'], summary: 'Current operator rankings', responses: { 200: { description: 'OK' } } } },
    '/rankings/compute': { post: { tags: ['Ranking'], summary: 'Recompute rankings', responses: { 200: { description: 'OK' } } } },
    '/dashboards/national': { get: { tags: ['Dashboards'], summary: 'National executive dashboard', responses: { 200: { description: 'OK' } } } },
    '/dashboards/national-qos': { get: { tags: ['Dashboards'], summary: 'National QoS comparison', responses: { 200: { description: 'OK' } } } },
    '/ai/ask': { post: { tags: ['AI'], summary: 'Conversational regulatory assistant', responses: { 200: { description: 'OK' } } } },
    '/ai/anomalies': { get: { tags: ['AI'], summary: 'Detected anomalies', responses: { 200: { description: 'OK' } } } },
  },
};
