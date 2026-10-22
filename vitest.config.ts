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
    projects: [
      {
        resolve,
        test: {
          name: "unit",
          environment: "node",
          include: ["packages/*/src/**/*.test.ts"],
          exclude: ["**/*.integration.test.ts", "**/node_modules/**"],
        },
      },
      {
        resolve,
        test: {
          name: "integration",
          environment: "node",
          include: ["packages/*/src/**/*.integration.test.ts"],
          globalSetup: ["./packages/db/src/testing/integration-global-setup.ts"],
          // One shared PostgreSQL database: files must not run against it concurrently.
          fileParallelism: false,
        },
      },
    ],
  },
});
