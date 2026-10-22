import { inject } from "vitest";

// Test-only augmentation of Vitest's provide/inject registry (unrelated to DI typing).
declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

/** URL of the migrated test database started by the global setup of the current Vitest project. */
export function testDatabaseUrl(): string {
  return inject("testDatabaseUrl");
}
