import { inject } from "vitest";

// Test-only augmentation of Vitest's provide/inject registry (unrelated to DI typing).
declare module "vitest" {
  export interface ProvidedContext {
    appUrl: string;
  }
}

/** Base URL of the application instance started by the `e2e` global setup. */
export function appUrl(): string {
  return inject("appUrl");
}
