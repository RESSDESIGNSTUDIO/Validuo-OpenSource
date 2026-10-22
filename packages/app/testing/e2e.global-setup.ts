import { reportStartupFailure, startTestDatabase } from "@validuo/db/testing";
import type { TestProject } from "vitest/node";

import { startAppServer } from "./app-server";
import "./vitest";

/** Global setup of the `e2e` project: migrated PostgreSQL + the production build on a free port. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const database = await reportStartupFailure(startTestDatabase());
  try {
    const app = await reportStartupFailure(startAppServer({ databaseUrl: database.url }));
    project.provide("appUrl", app.url);
    return async () => {
      await app.stop();
      await database.stop();
    };
  } catch (error) {
    await database.stop();
    throw error;
  }
}
