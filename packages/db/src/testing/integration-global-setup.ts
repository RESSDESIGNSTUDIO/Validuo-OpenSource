import { requireTestDatabaseUrl } from "./test-database";

// Fails the whole integration run before any test file touches a database.
export default function setup(): void {
  try {
    requireTestDatabaseUrl();
  } catch (error) {
    // Vitest's startup error printer cannot render stack traces from global setup files,
    // so print the reason ourselves before failing the run.
    console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
    throw error;
  }
}
