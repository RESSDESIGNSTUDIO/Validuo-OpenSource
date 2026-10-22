import { startTestDatabase } from "@validuo/db/testing";

import { startAppServer } from "./app-server";

/**
 * `npm run app:ephemeral` — a throwaway application instance for manual or agent testing:
 * migrated PostgreSQL (testcontainers, or TEST_DATABASE_URL) + the production build.
 * Requires `npm run build`. Stops everything on Ctrl+C.
 */
const database = await startTestDatabase();
const app = await startAppServer({ databaseUrl: database.url }).catch(async (error: unknown) => {
  await database.stop();
  throw error;
});

console.log(`
Validuo is running at ${app.url}  (database: ${new URL(database.url).host})

Drive it with agent-browser, e.g.:
  npx agent-browser --session manual open ${app.url}
  npx agent-browser --session manual snapshot
  npx agent-browser --session manual close

Press Ctrl+C to stop the app and the database.
`);

const shutdown = async () => {
  await app.stop();
  await database.stop();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
