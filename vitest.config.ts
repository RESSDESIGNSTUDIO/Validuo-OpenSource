import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const appSrc = fileURLToPath(new URL("./packages/app/src", import.meta.url));

// Tests import server modules directly, outside the React Server Components graph, where
// `server-only` would throw. Its `react-server` entry is the intended empty module.
const serverOnlyStub = fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url));

const resolve = {
  alias: [
    { find: /^@\//, replacement: `${appSrc}/` },
    { find: /^server-only$/, replacement: serverOnlyStub },
  ],
};

export default defineConfig({
  test: {
    // Global teardown stops containers and `next start`; the 10 s default is too tight.
    teardownTimeout: 30_000,
    // Every line, branch and function of production code (`packages/*/src`) is covered by unit
    // tests. Test infrastructure lives outside `src` (`packages/*/testing`, `packages/app/e2e`). The
    // installer (`scripts/`) is measured the same way: it is a product entry point.
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}", "scripts/**/*.mjs"],
      exclude: ["**/*.test.{ts,tsx,mjs}", "**/*.d.ts", "packages/db/src/migrations/**"],
      reporter: ["text", "html"],
      thresholds: { 100: true },
    },
    projects: [
      {
        resolve,
        test: {
          name: "unit",
          environment: "node",
          include: ["packages/*/{src,testing}/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
          exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
        },
      },
      {
        resolve,
        test: {
          name: "integration",
          environment: "node",
          include: ["packages/*/src/**/*.integration.test.ts"],
          globalSetup: ["./packages/db/testing/postgres.global-setup.ts"],
          // One shared PostgreSQL database: files must not run against it concurrently.
          fileParallelism: false,
        },
      },
      {
        resolve,
        test: {
          name: "e2e",
          environment: "node",
          include: ["packages/app/e2e/**/*.spec.ts"],
          globalSetup: ["./packages/app/testing/e2e.global-setup.ts"],
          // One application instance and one browser session per run.
          fileParallelism: false,
          testTimeout: 60_000,
        },
      },
    ],
  },
});
