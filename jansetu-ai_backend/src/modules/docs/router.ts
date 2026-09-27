import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../../config/openapi';

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

// swagger-ui-express expects the setup to be mounted with .use()
docsRouter.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'JanSetu AI — API Docs',
    customCss: '.topbar { display: none; }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  }),
);
