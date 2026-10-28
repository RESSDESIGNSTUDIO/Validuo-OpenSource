// Entry point of `npm run setup`. Plain ESM with Node built-ins only: it must run on a fresh
// clone, before `npm install` has provided tsx or any workspace package.
import { fileURLToPath } from "node:url";

import { createNodeDeps } from "./setup/node-deps.mjs";
import { runSetup } from "./setup/run.mjs";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

runSetup(createNodeDeps({ rootDir })).then((code) => {
  process.exitCode = code;
});
