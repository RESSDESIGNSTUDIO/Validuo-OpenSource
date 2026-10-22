import type { TestProject } from "vitest/node";

import { reportStartupFailure, startTestDatabase } from "./test-database";
import "./vitest";

/** Global setup of the `integration` project: one migrated PostgreSQL for the whole run. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const database = await reportStartupFailure(startTestDatabase());
  project.provide("testDatabaseUrl", database.url);
  return () => database.stop();
}
