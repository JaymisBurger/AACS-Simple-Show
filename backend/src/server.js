import { app } from './app.js';
import { env } from './config/env.js';
import { verifyDatabaseConnection } from './config/db.js';

async function startServer() {
  await verifyDatabaseConnection();

  app.listen(env.port, () => {
    console.log(`API server listening on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start API server:', error.message);
  process.exit(1);
});
