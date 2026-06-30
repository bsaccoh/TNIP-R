import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import apiRoutes from './routes/index.js';
import { openapiSpec } from './config/swagger.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.set('trust proxy', 1);

  // API (versioned)
  app.use('/api/v1', apiRoutes);

  // Swagger UI
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
